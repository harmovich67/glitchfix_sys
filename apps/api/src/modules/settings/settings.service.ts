import { Prisma } from '@prisma/client';
import { platformSettingsSchema, type PlatformSettings, type ContactInfo } from '@welco/shared';
import { prisma } from '../../core/prisma';

const KEY = 'platform';

export const DEFAULT_CONTACT_INFO: ContactInfo = {
  email: 'contact@welco.dev',
  phone: '+966 50 123 4567',
  whatsapp: '+966501234567',
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

export const DEFAULT_SETTINGS: PlatformSettings = {
  developerClientMode: 'moderated',
  emailNotifications: true,
  allowClientRegistration: true,
  contact: DEFAULT_CONTACT_INFO,
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
