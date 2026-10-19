#!/usr/bin/env node
/**
 * Switch the API between SQLite (default, local dev) and MySQL.
 *
 * Prisma needs the provider written into the schema, so `prisma/schema.prisma` (SQLite) stays the single
 * source of truth and this script derives `prisma/schema.mysql.prisma` from it: same models, provider
 * swapped, and MySQL native column types for text that outgrows VARCHAR(191) (reports, briefs, messages…).
 * The app code is identical for both — it only ever talks to the generated Prisma client.
 *
 *   node scripts/db-provider.mjs mysql  [--push] [--seed]   # DATABASE_URL must be mysql://user:pass@host:3306/db
 *   node scripts/db-provider.mjs sqlite [--push] [--seed]   # back to the local SQLite file
 *   node scripts/db-provider.mjs mysql --print-sql          # show the MySQL DDL without touching a database
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SQLITE_SCHEMA = join(root, 'prisma', 'schema.prisma');
const MYSQL_SCHEMA = join(root, 'prisma', 'schema.mysql.prisma');

// Node does not read .env on its own; pick up DATABASE_URL the same way the Prisma CLI will.
if (!process.env.DATABASE_URL && existsSync(join(root, '.env'))) {
  const m = /^DATABASE_URL\s*=\s*"?([^"\r\n]+)"?/m.exec(readFileSync(join(root, '.env'), 'utf8'));
  if (m) process.env.DATABASE_URL = m[1];
}

const [target, ...flags] = process.argv.slice(2);
if (!['mysql', 'sqlite'].includes(target)) {
  console.error('Usage: db-provider.mjs <mysql|sqlite> [--push] [--seed] [--print-sql]');
  process.exit(1);
}

/** MySQL native types. TEXT/LONGTEXT cannot carry a literal DEFAULT, so columns with one use VARCHAR. Every entry must match a real `Model.field`, or the script stops (schema drift guard). */
const NATIVE = {
  'ClientProfile.internalNotes': 'Text',
  'WorkflowTemplate.description': 'Text',
  'WorkflowStep.title': 'VarChar(255)',
  'WorkflowStep.description': 'Text',
  'Question.label': 'Text',
  'Question.placeholder': 'Text',
  'Question.helpText': 'Text',
  'Question.aiHint': 'Text',
  'Project.title': 'VarChar(255)',
  'Project.aiBrief': 'LongText',
  'ProjectEvent.title': 'VarChar(255)',
  'ProjectEvent.body': 'Text',
  'File.originalName': 'VarChar(255)',
  'Message.body': 'Text',
  'Task.title': 'VarChar(255)',
  'Task.description': 'Text',
  'Task.blockedReason': 'VarChar(500)',
  'Note.body': 'Text',
  'Notification.title': 'VarChar(255)',
  'Notification.body': 'Text',
  'AISettings.systemPrompt': 'VarChar(8000)',
  'AISettings.apiKeyEnc': 'Text',
  'AIMessage.content': 'LongText',
  'TechnicalReport.content': 'LongText',
  'TimeOffRequest.reason': 'VarChar(1000)',
  'TimeOffRequest.decisionNote': 'Text',
  'AuditLog.userAgent': 'Text',
  'Proposal.title': 'VarChar(255)',
  'Proposal.content': 'LongText',
  'Proposal.terms': 'VarChar(8000)',
  'Proposal.notes': 'Text',
  'Proposal.responseNote': 'VarChar(1000)',
  'Wireframe.title': 'VarChar(255)',
  'Wireframe.notes': 'Text',
  'Wireframe.responseNote': 'VarChar(1000)',
  'FixRequest.siteUrl': 'VarChar(500)',
  'FixRequest.loginUrl': 'VarChar(500)',
  'FixRequest.username': 'VarChar(255)',
  'FixRequest.passwordEnc': 'Text',
  'FixRequest.extraAccessEnc': 'Text',
  'FixRequest.problem': 'Text',
  'FixRequest.history': 'Text',
  'FixRequest.aiAnalysis': 'LongText',
};

/** Field names that usually hold prose: if one is left as VARCHAR(191) on MySQL, warn so it gets a mapping. */
const LONG_TEXT_HINT = /(body|content|description|reason|note|notes|prompt|label|brief|text|message|agent)$/i;

function toMysql(source) {
  const used = new Set();
  const warnings = [];
  let model = null;
  const out = source.split('\n').map((line) => {
    const m = /^model\s+(\w+)\s*\{/.exec(line);
    if (m) model = m[1];
    else if (/^\}/.test(line)) model = null;
    if (!model) return line;
    const f = /^(\s+)(\w+)(\s+)String(\?)?(?=\s|$)(.*)$/.exec(line);
    if (!f || /@db\./.test(line)) return line;
    const key = `${model}.${f[2]}`;
    if (NATIVE[key]) {
      if (/Text$/.test(NATIVE[key]) && /@default\(/.test(line)) {
        console.error(`❌ ${key} has a @default but is mapped to ${NATIVE[key]}; MySQL forbids literal defaults on TEXT. Use VarChar(n).`);
        process.exit(1);
      }
      used.add(key);
      return `${f[1]}${f[2]}${f[3]}String${f[4] ?? ''} @db.${NATIVE[key]}${f[5]}`;
    }
    if (LONG_TEXT_HINT.test(f[2]) && !/@id|@unique/.test(line)) warnings.push(key);
    return line;
  });
  const missing = Object.keys(NATIVE).filter((k) => !used.has(k));
  if (missing.length) {
    console.error(`❌ schema.prisma changed: these MySQL type mappings no longer match a String field:\n  ${missing.join('\n  ')}\nUpdate NATIVE in scripts/db-provider.mjs.`);
    process.exit(1);
  }
  if (warnings.length) console.warn(`⚠️  String fields that may hold long text but stay VARCHAR(191) on MySQL: ${warnings.join(', ')}`);
  const text = out.join('\n');
  if (!/provider\s*=\s*"sqlite"/.test(text)) {
    console.error('❌ Expected prisma/schema.prisma to use the sqlite provider.');
    process.exit(1);
  }
  return text.replace(/provider\s*=\s*"sqlite"/, 'provider = "mysql"');
}

const run = (args, env = {}) => {
  const r = spawnSync('npx', ['--no-install', ...args], { cwd: root, stdio: 'inherit', shell: true, env: { ...process.env, ...env } });
  if (r.status !== 0) process.exit(r.status ?? 1);
};

if (target === 'mysql') {
  const url = process.env.DATABASE_URL ?? '';
  const needsUrl = flags.includes('--push') || flags.includes('--seed');
  if (needsUrl && !/^mysql:\/\//.test(url)) {
    console.error('❌ Set DATABASE_URL="mysql://user:password@host:3306/database" in apps/api/.env (or your shell) first.');
    process.exit(1);
  }
  const source = readFileSync(SQLITE_SCHEMA, 'utf8').replace(/\r\n/g, '\n');
  writeFileSync(MYSQL_SCHEMA, toMysql(source));
  console.log('✔ Wrote prisma/schema.mysql.prisma');
  // `prisma validate/generate` read the URL only to check its scheme, so a placeholder is fine when none is set.
  const env = /^mysql:\/\//.test(url) ? {} : { DATABASE_URL: 'mysql://user:password@localhost:3306/welco' };
  run(['prisma', 'validate', '--schema', 'prisma/schema.mysql.prisma'], env);
  if (flags.includes('--print-sql')) {
    run(['prisma', 'migrate', 'diff', '--from-empty', '--to-schema-datamodel', 'prisma/schema.mysql.prisma', '--script'], env);
    process.exit(0);
  }
  run(['prisma', 'generate', '--schema', 'prisma/schema.mysql.prisma'], env);
  if (flags.includes('--push')) run(['prisma', 'db', 'push', '--schema', 'prisma/schema.mysql.prisma', '--skip-generate']);
  if (flags.includes('--seed')) run(['tsx', 'prisma/seed.ts']);
  console.log('✔ The API now uses MySQL. Run "npm run db:sqlite -w @welco/api" to go back to SQLite.');
} else {
  const url = process.env.DATABASE_URL ?? '';
  if ((flags.includes('--push') || flags.includes('--seed')) && !/^file:/.test(url)) {
    console.error('❌ Set DATABASE_URL="file:./dev.db" in apps/api/.env first.');
    process.exit(1);
  }
  run(['prisma', 'generate', '--schema', 'prisma/schema.prisma']);
  if (flags.includes('--push')) run(['prisma', 'db', 'push', '--schema', 'prisma/schema.prisma', '--skip-generate']);
  if (flags.includes('--seed')) run(['tsx', 'prisma/seed.ts']);
  console.log('✔ The API now uses SQLite.');
}
