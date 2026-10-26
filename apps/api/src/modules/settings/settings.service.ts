import { Prisma } from '@prisma/client';
import { brandSchema, platformSettingsSchema, proposalSettingsSchema, seoSchema, type BrandSettings, type ContactInfo, type PlatformSettings, type ProposalSettings, type SeoSettings } from '@welco/shared';
import { prisma } from '../../core/prisma';

const KEY = 'platform';

export const DEFAULT_CONTACT_INFO: ContactInfo = {
  email: 'saidd.mahmoud4@gmail.com',
  phone: '+20 102 259 6130',
  whatsapp: '+201022596130',
  addressAr: 'الرياض، المملكة العربية السعودية - طريق الملك فهد',
  addressEn: 'Riyadh, Saudi Arabia - King Fahd Road',
  workingHoursAr: 'الأحد - الخميس: ٩:٠٠ ص - ٦:٠٠ م',
  workingHoursEn: 'Sun - Thu: 9:00 AM - 6:00 PM',
  bioAr: 'منصة استكشاف وتحديد متطلبات المشاريع الذكية، مدعومة بالذكاء الاصطناعي.',
  bioEn: 'AI-guided project discovery & requirements management platform.',
  twitter: 'https://x.com',
  linkedin: 'https://linkedin.com',
  instagram: '',
  github: 'https://github.com',
};

export const DEFAULT_BRAND: BrandSettings = brandSchema.parse({});
export const DEFAULT_SEO: SeoSettings = seoSchema.parse({});

/** Reasonable starting terms; the owner should review them with their own legal adviser. */
export const DEFAULT_PROPOSAL: ProposalSettings = proposalSettingsSchema.parse({
  termsEn: `1. **Scope.** The work covers the scope described in this proposal. Anything outside it is handled through a written change request with its own price and timeline.
2. **Payment.** Invoices follow the payment schedule above and are due within 7 days of issue. Work on a phase may pause while a payment for it is overdue.
3. **Revisions.** Reasonable revisions to designs and content are included during each phase. Major changes after sign-off are treated as a change request.
4. **Client responsibilities.** The client provides content, brand assets, access and timely feedback. Delays on the client's side can move the delivery date.
5. **Third-party costs.** Domains, hosting, licences, payment-gateway and messaging fees are paid by the client and are not included in the price.
6. **Ownership.** Ownership of the final deliverables transfers to the client once the full amount has been paid. Third-party components stay under their own licences.
7. **Confidentiality.** Both parties keep the other's non-public information confidential.
8. **Support.** Defects found within 30 days of delivery that come from our work are fixed at no extra charge.
9. **Acceptance.** Approving this proposal online with your name is your written agreement to the scope, price and terms in it.`,
  termsAr: `1. **النطاق.** يشمل العمل النطاق الموضّح في هذا العرض فقط. أي إضافة خارجه تُنفَّذ عبر طلب تغيير مكتوب بسعر ومدة مستقلين.
2. **الدفع.** تصدر الفواتير وفق جدول الدفع أعلاه وتُستحق خلال 7 أيام من إصدارها، وقد تتوقف مرحلة العمل مؤقتاً عند تأخر دفعتها.
3. **التعديلات.** تشمل كل مرحلة تعديلات معقولة على التصاميم والمحتوى، أما التغييرات الكبيرة بعد الاعتماد فتُعامل كطلب تغيير.
4. **مسؤوليات العميل.** يوفّر العميل المحتوى وملفات الهوية والصلاحيات وملاحظاته في الوقت المناسب، وقد يؤثر التأخير من جهته على موعد التسليم.
5. **تكاليف الأطراف الثالثة.** النطاقات والاستضافة والتراخيص ورسوم بوابات الدفع والرسائل يتحملها العميل وليست ضمن السعر.
6. **الملكية.** تنتقل ملكية المخرجات النهائية إلى العميل بعد سداد كامل المبلغ، وتبقى المكوّنات الخارجية تحت تراخيصها.
7. **السرية.** يلتزم الطرفان بالحفاظ على سرية المعلومات غير المعلنة للطرف الآخر.
8. **الدعم.** تُصلَح دون مقابل إضافي العيوب الناتجة عن عملنا والمكتشفة خلال 30 يوماً من التسليم.
9. **القبول.** موافقتك على هذا العرض إلكترونياً باسمك تُعد إقراراً كتابياً بالنطاق والسعر والشروط الواردة فيه.`,
});

export const DEFAULT_SETTINGS: PlatformSettings = {
  developerClientMode: 'moderated',
  emailNotifications: true,
  allowClientRegistration: true,
  contact: DEFAULT_CONTACT_INFO,
  brand: DEFAULT_BRAND,
  seo: DEFAULT_SEO,
  proposal: DEFAULT_PROPOSAL,
};

let cache: { value: PlatformSettings; at: number } | null = null;

export const settingsService = {
  async get(): Promise<PlatformSettings> {
    if (cache && Date.now() - cache.at < 10_000) return cache.value;
    const row = await prisma.setting.findUnique({ where: { key: KEY } });
    const parsed = platformSettingsSchema.partial().safeParse(row?.value ?? {});
    const raw = parsed.success ? parsed.data : {};
    const value: PlatformSettings = {
      ...DEFAULT_SETTINGS,
      ...raw,
      contact: {
        ...DEFAULT_CONTACT_INFO,
        ...(raw.contact ?? {}),
      },
      brand: { ...DEFAULT_BRAND, ...(raw.brand ?? {}) },
      seo: { ...DEFAULT_SEO, ...(raw.seo ?? {}) },
      proposal: { ...DEFAULT_PROPOSAL, ...(raw.proposal ?? {}) },
    };
    cache = { value, at: Date.now() };
    return value;
  },

  async update(input: PlatformSettings): Promise<PlatformSettings> {
    await prisma.setting.upsert({
      where: { key: KEY },
      create: { key: KEY, value: input as unknown as Prisma.InputJsonValue },
      update: { value: input as unknown as Prisma.InputJsonValue },
    });
    cache = null;
    return this.get();
  },
};
