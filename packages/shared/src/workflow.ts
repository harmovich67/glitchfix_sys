/**
 * Workflow domain: the shape of a discovery journey and the condition engine that decides which
 * steps and questions a client sees. The same code runs in the browser (live branching) and on
 * the server (submission validation), so both always agree.
 */

export const QUESTION_TYPES = [
  'text',
  'textarea',
  'url',
  'select',
  'country',
  'single_choice',
  'multi_choice',
  'visual_choice',
  'feature_checklist',
  'color',
  'file',
  'url_list',
] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

/** Types whose value is picked from `options`. */
export const OPTION_TYPES: QuestionType[] = [
  'select',
  'single_choice',
  'multi_choice',
  'visual_choice',
  'feature_checklist',
];

/** Types whose value is an array. */
export const MULTI_VALUE_TYPES: QuestionType[] = ['multi_choice', 'feature_checklist', 'color', 'file', 'url_list'];

export const CONDITION_OPS = ['eq', 'neq', 'in', 'nin', 'includes', 'excludes', 'filled', 'empty'] as const;
export type ConditionOp = (typeof CONDITION_OPS)[number];

export interface ConditionRule {
  question: string;
  op: ConditionOp;
  value?: string | string[];
}

export interface Condition {
  match: 'all' | 'any';
  rules: ConditionRule[];
}

export type Translations = Partial<Record<string, Record<string, string>>>;

export interface QuestionOption {
  value: string;
  label: string;
  description?: string;
  icon?: string;
  /** Built-in visual preview, e.g. `style:luxury` or `font:serif`. */
  preview?: string;
  image?: string;
  i18n?: Translations | null;
}

export interface QuestionValidation {
  min?: number;
  max?: number;
  maxFiles?: number;
  accept?: 'image' | 'document' | 'any';
  multiple?: boolean;
}

export interface WorkflowQuestion {
  id?: string;
  key: string;
  type: QuestionType;
  label: string;
  placeholder?: string | null;
  helpText?: string | null;
  required: boolean;
  enabled: boolean;
  order: number;
  options?: QuestionOption[] | null;
  conditions?: Condition | null;
  validation?: QuestionValidation | null;
  aiHint?: string | null;
  i18n?: Translations | null;
}

export interface WorkflowStep {
  id?: string;
  key: string;
  title: string;
  description?: string | null;
  icon?: string | null;
  order: number;
  enabled: boolean;
  conditions?: Condition | null;
  i18n?: Translations | null;
  questions: WorkflowQuestion[];
}

export interface WorkflowDefinition {
  templateId: string;
  name: string;
  version: number;
  steps: WorkflowStep[];
}

export type AnswerValue = string | string[] | null | undefined;
export type AnswerMap = Record<string, AnswerValue>;

export function isEmptyValue(v: AnswerValue): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === 'string') return v.trim() === '';
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

function asArray(v: AnswerValue): string[] {
  if (v === null || v === undefined) return [];
  return Array.isArray(v) ? v : [v];
}

export function evaluateRule(rule: ConditionRule, answers: AnswerMap): boolean {
  const actual = answers[rule.question];
  const expected = asArray(rule.value);
  const actualArr = asArray(actual);
  switch (rule.op) {
    case 'filled':
      return !isEmptyValue(actual);
    case 'empty':
      return isEmptyValue(actual);
    case 'eq':
      return actualArr.length > 0 && actualArr.every((a) => a === expected[0]);
    case 'neq':
      return !(actualArr.length > 0 && actualArr.every((a) => a === expected[0]));
    case 'in':
    case 'includes':
      // "in": answer is one of the listed values · "includes": multi answer contains any listed value
      return actualArr.some((a) => expected.includes(a));
    case 'nin':
    case 'excludes':
      return !actualArr.some((a) => expected.includes(a));
    default:
      return true;
  }
}

export function evaluateCondition(condition: Condition | null | undefined, answers: AnswerMap): boolean {
  if (!condition || !condition.rules || condition.rules.length === 0) return true;
  const results = condition.rules.map((r) => evaluateRule(r, answers));
  return condition.match === 'any' ? results.some(Boolean) : results.every(Boolean);
}

export function visibleQuestions(step: WorkflowStep, answers: AnswerMap): WorkflowQuestion[] {
  return [...step.questions]
    .sort((a, b) => a.order - b.order)
    .filter((q) => q.enabled && evaluateCondition(q.conditions, answers));
}

/** Steps the client will walk through given the current answers (ordered, enabled, conditions met, non-empty). */
export function visibleSteps(def: Pick<WorkflowDefinition, 'steps'>, answers: AnswerMap): WorkflowStep[] {
  return [...def.steps]
    .sort((a, b) => a.order - b.order)
    .filter((s) => s.enabled && evaluateCondition(s.conditions, answers))
    .filter((s) => visibleQuestions(s, answers).length > 0);
}

export interface ValidationIssue {
  stepKey: string;
  questionKey: string;
  message: string;
}

export function validateQuestion(q: WorkflowQuestion, value: AnswerValue): string | null {
  if (isEmptyValue(value)) return q.required ? 'required' : null;
  const v = q.validation ?? {};
  // Choice / list questions: min & max count selections (a single-choice answer is one selection).
  if (Array.isArray(value) || OPTION_TYPES.includes(q.type) || MULTI_VALUE_TYPES.includes(q.type)) {
    const count = asArray(value).length;
    if (v.min !== undefined && count < v.min) return `min:${v.min}`;
    if (v.max !== undefined && count > v.max) return `max:${v.max}`;
    return null;
  }
  const text = String(value);
  if (v.min !== undefined && text.trim().length < v.min) return `minLength:${v.min}`;
  if (v.max !== undefined && text.length > v.max) return `maxLength:${v.max}`;
  if (q.type === 'url' && !/^https?:\/\/\S+\.\S+/i.test(text.trim()) && !/^[\w-]+(\.[\w-]+)+\S*$/.test(text.trim())) return 'url';
  return null;
}

export function validateStep(step: WorkflowStep, answers: AnswerMap): ValidationIssue[] {
  return visibleQuestions(step, answers)
    .map((q) => ({ q, msg: validateQuestion(q, answers[q.key]) }))
    .filter((x) => x.msg)
    .map((x) => ({ stepKey: step.key, questionKey: x.q.key, message: x.msg as string }));
}

export function validateJourney(def: Pick<WorkflowDefinition, 'steps'>, answers: AnswerMap): ValidationIssue[] {
  return visibleSteps(def, answers).flatMap((s) => validateStep(s, answers));
}

/** 0–100 completion based on answered visible questions (required count double). */
export function journeyProgress(def: Pick<WorkflowDefinition, 'steps'>, answers: AnswerMap): number {
  let total = 0;
  let done = 0;
  for (const s of visibleSteps(def, answers)) {
    for (const q of visibleQuestions(s, answers)) {
      const w = q.required ? 2 : 1;
      total += w;
      if (!isEmptyValue(answers[q.key])) done += w;
    }
  }
  return total === 0 ? 0 : Math.round((done / total) * 100);
}

/** All question keys in a definition, for referencing from conditions. */
export function allQuestions(def: Pick<WorkflowDefinition, 'steps'>): (WorkflowQuestion & { stepKey: string })[] {
  return def.steps.flatMap((s) => s.questions.map((q) => ({ ...q, stepKey: s.key })));
}

/** Pick a translated field with fallback: tr(step, 'title', 'ar'). */
export function tr<T extends { i18n?: Translations | null }>(obj: T, field: keyof T & string, locale: string): string {
  const translated = obj.i18n?.[locale]?.[field];
  const base = obj[field];
  return (translated && translated.trim()) || (typeof base === 'string' ? base : '') || '';
}

/** Human-readable label for an answer value, resolving option labels. */
export function formatAnswer(q: WorkflowQuestion, value: AnswerValue, locale = 'en'): string[] {
  const arr = asArray(value);
  if (!q.options?.length) return arr;
  return arr.map((v) => {
    const opt = q.options!.find((o) => o.value === v);
    return opt ? tr(opt, 'label', locale) : v;
  });
}
