/** Commercial proposals: shared constants and the one place money is computed (API and UI must agree to the cent). */

export const PROPOSAL_STATUSES = ['DRAFT', 'SENT', 'ACCEPTED', 'DECLINED', 'REVISION_REQUESTED', 'WITHDRAWN', 'SUPERSEDED'] as const;
export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];

export const CURRENCIES = ['USD', 'EUR', 'GBP', 'SAR', 'AED', 'EGP', 'KWD', 'QAR', 'OMR', 'BHD', 'JOD'] as const;
export type Currency = (typeof CURRENCIES)[number];

export interface PaymentMilestone {
  label: string;
  percent: number;
}

/** Ready-made payment schedules the manager can start from (labels are translated in the UI). */
export const PAYMENT_PRESETS: Record<string, { labelKey: string; milestones: { key: string; percent: number }[] }> = {
  half: { labelKey: 'proposal.presetHalf', milestones: [{ key: 'start', percent: 50 }, { key: 'delivery', percent: 50 }] },
  thirds: { labelKey: 'proposal.presetThirds', milestones: [{ key: 'start', percent: 30 }, { key: 'middle', percent: 40 }, { key: 'delivery', percent: 30 }] },
  full: { labelKey: 'proposal.presetFull', milestones: [{ key: 'delivery', percent: 100 }] },
};

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export interface ProposalTotals {
  subtotal: number;
  tax: number;
  total: number;
  /** Each milestone with its amount; the last one absorbs rounding so the schedule always sums to the total. */
  schedule: (PaymentMilestone & { amount: number })[];
}

export function proposalTotals(amount: number, taxPercent: number, payments: PaymentMilestone[]): ProposalTotals {
  const subtotal = round2(amount);
  const tax = round2((subtotal * taxPercent) / 100);
  const total = round2(subtotal + tax);
  let allocated = 0;
  const schedule = payments.map((p, i) => {
    const last = i === payments.length - 1;
    const value = last ? round2(total - allocated) : round2((total * p.percent) / 100);
    allocated = round2(allocated + value);
    return { ...p, amount: value };
  });
  return { subtotal, tax, total, schedule };
}

export function formatMoney(value: number, currency: string, locale = 'en') {
  try {
    return new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-US', { style: 'currency', currency, maximumFractionDigits: value % 1 === 0 ? 0 : 2 }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}
