import { allQuestions, formatAnswer, tr, type AnswerMap, type WorkflowDefinition } from '@welco/shared';
import { answeredRows } from './mock-report';

/**
 * Offline (no API key) client-facing proposal text. It never mentions money: the price, tax and payment
 * schedule are rendered from the structured fields next to this text.
 */
export interface ProposalFacts {
  brand: string;
  projectTitle: string;
  projectType: string | null;
  client: { name: string; company: string };
  durationWeeks: number | null;
}

/** Splits the timeline into phases whose weeks always add up to the total. */
function phaseWeeks(total: number) {
  const shares = [0.25, 0.5, 0.15, 0.1];
  const raw = shares.map((s) => Math.max(1, Math.round(total * s)));
  raw[1] += total - raw.reduce((a, b) => a + b, 0); // the build phase absorbs rounding
  return raw[1] < 1 ? [1, Math.max(1, total - 3), 1, 1] : raw;
}

export function mockProposal(input: { facts: ProposalFacts; def: WorkflowDefinition; answers: AnswerMap; files: Map<string, string>; locale: string }) {
  const { facts, def, answers } = input;
  const ar = input.locale === 'ar';
  const L = (en: string, a: string) => (ar ? a : en);
  const sep = ar ? '، ' : ', ';
  const who = facts.client.company || facts.client.name;
  const groups = answeredRows(def, answers, input.files, input.locale);
  const typeQ = allQuestions(def).find((q) => q.key === 'project_type');
  const typeLabel = facts.projectType && typeQ ? formatAnswer(typeQ, facts.projectType, input.locale)[0] : null;
  const featureRows = groups.flatMap((g) => g.rows).filter((r) => r.q.type === 'feature_checklist');
  const features = featureRows.flatMap((r) => r.shown);
  const context = groups
    .filter((g) => ['business', 'brand'].includes(g.step.key) || g.step.key.includes('project'))
    .flatMap((g) => g.rows)
    .filter((r) => r.q.type !== 'file' && r.q.type !== 'visual_choice' && r.shown.join('').length < 260)
    .slice(0, 6);
  const weeks = facts.durationWeeks && facts.durationWeeks > 0 ? facts.durationWeeks : null;
  const phases = weeks && weeks >= 4 ? phaseWeeks(weeks) : null;
  const wk = (n: number) => (ar ? (n === 1 ? 'أسبوع' : n === 2 ? 'أسبوعان' : `${n} أسابيع`) : `${n} week${n === 1 ? '' : 's'}`);

  const lines: string[] = [
    `## ${L('1. Executive summary', '1. الملخص التنفيذي')}`,
    L(
      `Thank you for choosing ${facts.brand}. Based on what you shared with us, this proposal outlines how we will deliver **${facts.projectTitle}**${typeLabel ? `, a ${typeLabel}` : ''}, for ${who}. It covers the scope we understood, what you will receive, the timeline and what we need from you to start.`,
      `شكراً لاختيارك ${facts.brand}. بناءً على ما شاركتموه معنا، يوضّح هذا العرض كيف سنُنجز **${facts.projectTitle}**${typeLabel ? ` (${typeLabel})` : ''} لصالح ${who}، ويشمل النطاق الذي فهمناه وما ستتسلّمونه والجدول الزمني وما نحتاجه منكم لنبدأ.`,
    ),
    '',
    `## ${L('2. Our understanding of your needs', '2. فهمنا لاحتياجاتكم')}`,
    ...(context.length
      ? context.map((r) => `- **${tr(r.q, 'label', input.locale)}:** ${r.shown.join(sep)}`)
      : [`- ${L('You asked us to build a digital product tailored to your business and customers.', 'طلبتم منا بناء منتج رقمي مصمَّم خصيصاً لنشاطكم وعملائكم.')}`]),
    '',
    `## ${L('3. Proposed solution & scope', '3. الحل المقترح والنطاق')}`,
    ...(features.length
      ? [L(`The scope includes the ${features.length} capabilities you selected:`, `يشمل النطاق القدرات التي اخترتموها وعددها ${features.length}:`), ...features.map((f) => `- ${f}`)]
      : [`- ${L('The scope follows the requirements you submitted in your project journey.', 'يتبع النطاق المتطلبات التي قدّمتموها في رحلة المشروع.')}`]),
    '',
    `## ${L('4. Deliverables', '4. المخرجات')}`,
    `- ${L('The finished, tested product deployed and ready for use', 'المنتج النهائي مختبَراً ومنشوراً وجاهزاً للاستخدام')}`,
    `- ${L('Responsive design that works on phones, tablets and desktops', 'تصميم متجاوب يعمل على الجوال والتابلت والحاسوب')}`,
    `- ${L('An admin walkthrough and handover documentation', 'شرح لوحة الإدارة ووثائق التسليم')}`,
    `- ${L('Preview links along the way so you can review progress', 'روابط معاينة أثناء العمل لتتابعوا التقدم')}`,
    '',
    `## ${L('5. Timeline & phases', '5. الجدول الزمني والمراحل')}`,
    ...(phases && weeks
      ? [
          L(`We estimate **${wk(weeks)}** from kickoff to launch:`, `نقدّر المدة بـ **${wk(weeks)}** من الانطلاق حتى الإطلاق:`),
          `1. **${L('Discovery & design', 'الاكتشاف والتصميم')}** — ${wk(phases[0])}`,
          `2. **${L('Build', 'التنفيذ')}** — ${wk(phases[1])}`,
          `3. **${L('Testing & feedback', 'الاختبار والملاحظات')}** — ${wk(phases[2])}`,
          `4. **${L('Launch & handover', 'الإطلاق والتسليم')}** — ${wk(phases[3])}`,
        ]
      : weeks
        ? [L(`We estimate **${wk(weeks)}** from kickoff to launch, with review points along the way.`, `نقدّر المدة بـ **${wk(weeks)}** من الانطلاق حتى الإطلاق مع نقاط مراجعة خلال العمل.`)]
        : [`- ${L('The detailed schedule is confirmed at kickoff, once you approve this proposal.', 'يُؤكَّد الجدول التفصيلي عند الانطلاق بعد موافقتكم على العرض.')}`]),
    '',
    `## ${L('6. What we need from you', '6. ما نحتاجه منكم')}`,
    `- ${L('Your written content, images and brand files', 'المحتوى المكتوب والصور وملفات الهوية')}`,
    `- ${L('A single point of contact who can give quick feedback and approvals', 'شخص واحد للتواصل يقدّم الملاحظات والموافقات بسرعة')}`,
    `- ${L('Access to the accounts and services the project connects to', 'الوصول إلى الحسابات والخدمات التي يرتبط بها المشروع')}`,
    '',
    `## ${L('7. Not included', '7. غير مشمول')}`,
    `- ${L('Features that are not listed in the scope above', 'أي ميزات غير مذكورة في النطاق أعلاه')}`,
    `- ${L('Third-party fees such as domains, hosting and payment-gateway charges', 'رسوم الأطراف الثالثة كالنطاق والاستضافة وبوابات الدفع')}`,
    '',
    `## ${L('8. Next steps', '8. الخطوات التالية')}`,
    `1. ${L('Review this proposal and ask us anything in the project conversation', 'راجعوا هذا العرض واسألونا عن أي شيء في محادثة المشروع')}`,
    `2. ${L('Approve it online with your name', 'وافقوا عليه إلكترونياً باسمكم')}`,
    `3. ${L('We schedule the kickoff and begin work', 'نحدّد موعد الانطلاق ونبدأ العمل')}`,
  ];
  return lines.filter((l, i, a) => !(l === '' && a[i - 1] === '')).join('\n');
}
