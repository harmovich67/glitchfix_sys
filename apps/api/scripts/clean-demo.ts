/* Removes the demo organisation so the platform starts empty and ready for real projects.
 *
 *   npm run db:clean -w @welco/api                      # shows what would be deleted, asks you to confirm
 *   npm run db:clean -w @welco/api -- --dry-run         # only show the numbers
 *   npm run db:clean -w @welco/api -- --yes --admin-email you@company.com --admin-password 'a-strong-password'
 *
 * Deleted:  every project (answers, conversations, files, tickets, notes, timeline, technical reports), every client,
 *           time-off requests, notifications, AI usage & chat history, the audit log and uploaded files on disk.
 * Kept:     the whole team (Super Admin, Admin, Project Manager, Developer accounts), the discovery journey templates,
 *           platform settings (name, SEO, contact) and AI settings.
 *           Pass --delete-team to also remove every team account except Super Admins.
 */
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const argv = process.argv.slice(2);
const flag = (name: string) => argv.includes(`--${name}`);
const opt = (name: string) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
};

const dryRun = flag('dry-run');
const keepTeam = !flag('delete-team');
const adminEmail = opt('admin-email')?.trim().toLowerCase();
const adminPassword = opt('admin-password');
const adminName = opt('admin-name')?.trim();
const STORAGE_DIR = process.env.STORAGE_DIR ? path.resolve(process.env.STORAGE_DIR) : path.resolve(process.cwd(), 'storage');

function fail(message: string): never {
  console.error(`\n❌ ${message}\n`);
  process.exit(1);
}

async function main() {
  if (adminEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) fail('--admin-email is not a valid e-mail address.');
  if (adminPassword !== undefined && adminPassword.length < 8) fail('--admin-password must be at least 8 characters.');

  const superAdmins = await prisma.user.findMany({ where: { role: 'SUPER_ADMIN' }, orderBy: { createdAt: 'asc' }, select: { id: true, email: true, name: true } });
  if (!superAdmins.length) fail('There is no Super Admin account to keep, so nothing was changed. Create one first (Team page) or run the seed.');
  const owner = superAdmins[0];

  if (adminEmail && adminEmail !== owner.email) {
    const taken = await prisma.user.findUnique({ where: { email: adminEmail }, select: { id: true } });
    if (taken && taken.id !== owner.id) fail(`${adminEmail} already belongs to another account. Choose a different --admin-email.`);
  }

  const doomedUsers = await prisma.user.findMany({
    where: keepTeam ? { role: 'CLIENT' } : { role: { not: 'SUPER_ADMIN' } },
    select: { email: true, role: true },
    orderBy: [{ role: 'asc' }, { email: 'asc' }],
  });

  const counts = {
    projects: await prisma.project.count(),
    'client / team accounts': doomedUsers.length,
    'project files (rows)': await prisma.file.count(),
    messages: await prisma.message.count(),
    tickets: await prisma.task.count(),
    'technical reports': await prisma.technicalReport.count(),
    'time-off requests': await prisma.timeOffRequest.count(),
    notifications: await prisma.notification.count(),
    'AI usage + chat rows': (await prisma.aIUsage.count()) + (await prisma.aIMessage.count()),
    'audit log rows': await prisma.auditLog.count(),
  };
  const templates = await prisma.workflowTemplate.count();

  console.log('\n🧹 Welco — remove demo data\n');
  console.log('Will be deleted:');
  for (const [k, v] of Object.entries(counts)) console.log(`  • ${String(v).padStart(5)}  ${k}`);
  if (doomedUsers.length) {
    const shown = doomedUsers.slice(0, 25).map((u) => `${u.email} (${u.role})`);
    console.log(`\nAccounts that will be deleted:\n  ${shown.join('\n  ')}${doomedUsers.length > shown.length ? `\n  … and ${doomedUsers.length - shown.length} more` : ''}`);
  }
  const kept = await prisma.user.findMany({
    where: keepTeam ? { role: { not: 'CLIENT' } } : { role: 'SUPER_ADMIN' },
    select: { email: true, role: true },
    orderBy: [{ role: 'asc' }, { email: 'asc' }],
  });
  console.log(`\nKept: ${kept.length} team account(s) — ${kept.map((u) => `${u.email} (${u.role})`).join(', ')}; ${templates} journey template(s); platform & AI settings.`);
  if (!templates) console.log('⚠️  No journey template exists — clients will have nothing to fill in. Create one in the Workflow Builder.');
  const demoLogins = kept.filter((u) => /@welco\.dev$/i.test(u.email) && !(adminEmail && u.email === owner.email)).length;
  if (demoLogins)
    console.log(`⚠️  ${demoLogins} kept account(s) still use the public demo password (Welco123!). Change each one (Settings → Security), or replace the Super Admin now with --admin-email / --admin-password.`);

  if (dryRun) return console.log('\nDry run — nothing was changed.\n');

  if (!flag('yes')) {
    if (!process.stdin.isTTY) fail('Refusing to delete without confirmation. Re-run in a terminal, or pass --yes.');
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = (await rl.question('\nThis cannot be undone. Type CLEAN to continue: ')).trim();
    rl.close();
    if (answer !== 'CLEAN') return console.log('\nCancelled — nothing was changed.\n');
  }

  // Children first, so the order is valid on SQLite and MySQL alike.
  await prisma.$transaction([
    prisma.technicalReportShare.deleteMany(),
    prisma.technicalReport.deleteMany(),
    prisma.timeOffRequest.deleteMany(),
    prisma.aIMessage.deleteMany(),
    prisma.aIUsage.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.message.deleteMany(),
    prisma.thread.deleteMany(),
    prisma.note.deleteMany(),
    prisma.task.deleteMany(),
    prisma.file.deleteMany(),
    prisma.projectEvent.deleteMany(),
    prisma.projectStep.deleteMany(),
    prisma.answer.deleteMany(),
    prisma.projectMember.deleteMany(),
    prisma.project.deleteMany(),
    prisma.user.deleteMany({ where: keepTeam ? { role: 'CLIENT' } : { role: { not: 'SUPER_ADMIN' } } }),
  ]);

  let removedFiles = 0;
  if (fs.existsSync(STORAGE_DIR))
    for (const f of fs.readdirSync(STORAGE_DIR)) {
      fs.rmSync(path.join(STORAGE_DIR, f), { force: true, recursive: true });
      removedFiles++;
    }

  // Replace the demo credentials of the kept Super Admin, if asked.
  const update: { email?: string; name?: string; passwordHash?: string; tokenVersion?: { increment: number } } = {};
  if (adminEmail) update.email = adminEmail;
  if (adminName) update.name = adminName;
  if (adminPassword) {
    update.passwordHash = await bcrypt.hash(adminPassword, 10);
    update.tokenVersion = { increment: 1 }; // signs out any session opened with the old password
  }
  const admin = Object.keys(update).length ? await prisma.user.update({ where: { id: owner.id }, data: update }) : owner;

  await prisma.auditLog.create({ data: { actorId: owner.id, action: 'system.demo_data_cleared', entityType: 'System', meta: { removed: counts, keptTeam: keepTeam } } });

  console.log(`\n✅ Demo data removed (${removedFiles} uploaded file(s) deleted from disk).`);
  console.log(`   Sign in as: ${admin.email}${adminPassword ? '  (with the password you just set)' : ''}`);
  console.log('   Clients can now register and start projects; add your team from the Team page.\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
