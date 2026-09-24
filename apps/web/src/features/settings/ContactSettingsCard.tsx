import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Mail,
  Phone,
  MessageCircle,
  MapPin,
  Clock,
  Globe,
  Share2,
  Save,
  CheckCircle2,
  Sparkles,
  Eye,
  Languages,
} from 'lucide-react';
import type { PlatformSettings, ContactInfo } from '@welco/shared';
import { useI18n } from '../../lib/i18n';
import { Card, CardHeader } from '../../components/ui/surfaces';
import { Field, Input, Textarea } from '../../components/ui/form';
import { Button } from '../../components/ui/button';

interface Props {
  settings: PlatformSettings;
  onSave: (updated: PlatformSettings) => void;
  isPending: boolean;
}

export function ContactSettingsCard({ settings, onSave, isPending }: Props) {
  const { locale, brand } = useI18n();
  const isAr = locale === 'ar';

  const defaultContact: ContactInfo = {
    email: '',
    phone: '',
    whatsapp: '',
    addressAr: '',
    addressEn: '',
    workingHoursAr: '',
    workingHoursEn: '',
    bioAr: '',
    bioEn: '',
    twitter: '',
    linkedin: '',
    instagram: '',
    github: '',
  };

  const [contact, setContact] = useState<ContactInfo>({
    ...defaultContact,
    ...(settings.contact ?? {}),
  });

  // Sync if settings data updates
  useEffect(() => {
    if (settings.contact) {
      setContact((prev) => ({
        ...defaultContact,
        ...prev,
        ...settings.contact,
      }));
    }
  }, [settings.contact]);

  const [previewLang, setPreviewLang] = useState<'ar' | 'en'>(locale);

  const update = <K extends keyof ContactInfo>(key: K, val: ContactInfo[K]) => {
    setContact((prev) => ({ ...prev, [key]: val }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...settings,
      contact,
    });
  };

  return (
    <Card className="lg:col-span-2">
      <CardHeader
        title={isAr ? 'بيانات التواصل وروابط الفوتر (عربي وإنجليزي)' : 'Contact Info & Footer Details (Bilingual)'}
        description={
          isAr
            ? 'أدخل بيانات التواصل والمقر وأوقات العمل باللغتين العربية والإنجليزية لتظهر ديناميكياً في الفوتر للزوار.'
            : 'Configure bilingual contact details, address, working hours, and social media links for the public footer.'
        }
        icon={<Globe className="size-4 text-brand" />}
      />

      <form onSubmit={handleSubmit} className="space-y-6 px-6 pb-6">
        {/* Section 1: Direct Contact Numbers & Email */}
        <div className="rounded-2xl border border-border/80 bg-surface-2/40 p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-border/60 pb-3">
            <span className="flex size-7 items-center justify-center rounded-lg bg-brand-soft text-brand">
              <Mail className="size-4" />
            </span>
            <span className="text-sm font-semibold text-fg">
              {isAr ? 'قنوات التواصل المباشرة (البريد والهاتف)' : 'Direct Communication Channels'}
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field
              label={isAr ? 'البريد الإلكتروني للتواصل' : 'Contact Email'}
              hint={isAr ? 'يظهر كرابط بريد مباشر (mailto)' : 'Shown as direct mailto link'}
            >
              <Input
                type="email"
                placeholder="contact@welco.dev"
                icon={<Mail className="size-4" />}
                value={contact.email}
                onChange={(e) => update('email', e.target.value)}
              />
            </Field>

            <Field
              label={isAr ? 'رقم الهاتف المباشر' : 'Phone Number'}
              hint={isAr ? 'مثال: +966 50 123 4567' : 'e.g. +966 50 123 4567'}
            >
              <Input
                type="text"
                placeholder="+966 50 123 4567"
                icon={<Phone className="size-4" />}
                value={contact.phone}
                onChange={(e) => update('phone', e.target.value)}
              />
            </Field>

            <Field
              label={isAr ? 'رقم الواتساب (محادثة فورية)' : 'WhatsApp Number'}
              hint={isAr ? 'مع رمز الدولة بدون صفر، مثال: 966501234567' : 'With country code, e.g. 966501234567'}
            >
              <Input
                type="text"
                placeholder="966501234567"
                icon={<MessageCircle className="size-4" />}
                value={contact.whatsapp}
                onChange={(e) => update('whatsapp', e.target.value)}
              />
            </Field>
          </div>
        </div>

        {/* Section 2: Bilingual Address & Working Hours (Arabic & English) */}
        <div className="rounded-2xl border border-border/80 bg-surface-2/40 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                <Languages className="size-4" />
              </span>
              <span className="text-sm font-semibold text-fg">
                {isAr ? 'العنوان وأوقات العمل (باللغتين)' : 'Bilingual Address & Working Hours'}
              </span>
            </div>
            <span className="text-xs text-muted">
              {isAr ? 'عربي 🇸🇦 · English 🇬🇧' : 'Arabic & English'}
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Arabic Address */}
            <Field
              label={isAr ? 'العنوان والمقر (بالعربية)' : 'Headquarters Address (Arabic)'}
              hint={isAr ? 'يظهر للزائرين عند تصفح الموقع بالعربية' : 'Displayed in Arabic mode'}
            >
              <Input
                dir="rtl"
                placeholder="الرياض، المملكة العربية السعودية - طريق الملك فهد"
                icon={<MapPin className="size-4" />}
                value={contact.addressAr}
                onChange={(e) => update('addressAr', e.target.value)}
              />
            </Field>

            {/* English Address */}
            <Field
              label={isAr ? 'العنوان والمقر (بالإنجليزية)' : 'Headquarters Address (English)'}
              hint={isAr ? 'يظهر للزائرين عند تصفح الموقع بالإنجليزية' : 'Displayed in English mode'}
            >
              <Input
                dir="ltr"
                placeholder="Riyadh, Saudi Arabia - King Fahd Road"
                icon={<MapPin className="size-4" />}
                value={contact.addressEn}
                onChange={(e) => update('addressEn', e.target.value)}
              />
            </Field>

            {/* Arabic Working Hours */}
            <Field
              label={isAr ? 'أوقات وساعات العمل (بالعربية)' : 'Working Hours (Arabic)'}
              hint={isAr ? 'مثال: الأحد - الخميس: ٩:٠٠ ص - ٦:٠٠ م' : 'e.g. الأحد - الخميس: ٩:٠٠ ص - ٦:٠٠ م'}
            >
              <Input
                dir="rtl"
                placeholder="الأحد - الخميس: ٩:٠٠ ص - ٦:٠٠ م"
                icon={<Clock className="size-4" />}
                value={contact.workingHoursAr}
                onChange={(e) => update('workingHoursAr', e.target.value)}
              />
            </Field>

            {/* English Working Hours */}
            <Field
              label={isAr ? 'أوقات وساعات العمل (بالإنجليزية)' : 'Working Hours (English)'}
              hint={isAr ? 'مثال: Sun - Thu: 9:00 AM - 6:00 PM' : 'e.g. Sun - Thu: 9:00 AM - 6:00 PM'}
            >
              <Input
                dir="ltr"
                placeholder="Sun - Thu: 9:00 AM - 6:00 PM"
                icon={<Clock className="size-4" />}
                value={contact.workingHoursEn}
                onChange={(e) => update('workingHoursEn', e.target.value)}
              />
            </Field>
          </div>
        </div>

        {/* Section 3: Bilingual Footer Bio / About */}
        <div className="rounded-2xl border border-border/80 bg-surface-2/40 p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-border/60 pb-3">
            <span className="flex size-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
              <Sparkles className="size-4" />
            </span>
            <span className="text-sm font-semibold text-fg">
              {isAr ? 'نبذة تعريفية في الفوتر أسفل الشعار (باللغتين)' : 'Footer About / Bio Text'}
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label={isAr ? 'النبذة بالعربية (Arabic Bio)' : 'Arabic Bio'}
              hint={isAr ? 'وصف موجز للمنصة يظهر تحت اللوجو في الفوتر العربي' : 'Short description below footer logo'}
            >
              <Textarea
                dir="rtl"
                rows={2}
                placeholder="منصة استكشاف وتحديد متطلبات المشاريع الذكية، مدعومة بالذكاء الاصطناعي."
                value={contact.bioAr}
                onChange={(e) => update('bioAr', e.target.value)}
              />
            </Field>

            <Field
              label={isAr ? 'النبذة بالإنجليزية (English Bio)' : 'English Bio'}
              hint={isAr ? 'وصف موجز يظهر تحت اللوجو في الفوتر الإنجليزي' : 'Short description in English'}
            >
              <Textarea
                dir="ltr"
                rows={2}
                placeholder="AI-guided project discovery & requirements management platform."
                value={contact.bioEn}
                onChange={(e) => update('bioEn', e.target.value)}
              />
            </Field>
          </div>
        </div>

        {/* Section 4: Social Media Links */}
        <div className="rounded-2xl border border-border/80 bg-surface-2/40 p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-border/60 pb-3">
            <span className="flex size-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600">
              <Share2 className="size-4" />
            </span>
            <span className="text-sm font-semibold text-fg">
              {isAr ? 'روابط شبكات التواصل الاجتماعي' : 'Social Media Links'}
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label={isAr ? 'رابط منصة X (تويتر)' : 'X / Twitter URL'}>
              <Input
                type="url"
                dir="ltr"
                placeholder="https://x.com/username"
                value={contact.twitter}
                onChange={(e) => update('twitter', e.target.value)}
              />
            </Field>

            <Field label={isAr ? 'رابط لينكد إن (LinkedIn)' : 'LinkedIn URL'}>
              <Input
                type="url"
                dir="ltr"
                placeholder="https://linkedin.com/company/..."
                value={contact.linkedin}
                onChange={(e) => update('linkedin', e.target.value)}
              />
            </Field>

            <Field label={isAr ? 'رابط إنستغرام (Instagram)' : 'Instagram URL'}>
              <Input
                type="url"
                dir="ltr"
                placeholder="https://instagram.com/..."
                value={contact.instagram}
                onChange={(e) => update('instagram', e.target.value)}
              />
            </Field>

            <Field label={isAr ? 'رابط جيتهاب (GitHub)' : 'GitHub URL'}>
              <Input
                type="url"
                dir="ltr"
                placeholder="https://github.com/..."
                value={contact.github}
                onChange={(e) => update('github', e.target.value)}
              />
            </Field>
          </div>
        </div>

        {/* Section 5: Live Interactive Footer Preview */}
        <div className="rounded-2xl border border-border bg-surface p-5 space-y-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <Eye className="size-4 text-brand" />
              <span className="text-sm font-bold text-fg">
                {isAr ? 'معاينة حية لشكل الفوتر كما سيظهر للزوار:' : 'Live Footer Preview for Visitors:'}
              </span>
            </div>

            {/* Language toggle for preview */}
            <div className="flex items-center gap-1 rounded-xl bg-surface-2 p-1 text-xs">
              <button
                type="button"
                onClick={() => setPreviewLang('ar')}
                className={`rounded-lg px-3 py-1 font-medium transition-all ${
                  previewLang === 'ar' ? 'bg-surface text-brand shadow-sm font-bold' : 'text-muted hover:text-fg'
                }`}
              >
                🇸🇦 معاينة بالعربية
              </button>
              <button
                type="button"
                onClick={() => setPreviewLang('en')}
                className={`rounded-lg px-3 py-1 font-medium transition-all ${
                  previewLang === 'en' ? 'bg-surface text-brand shadow-sm font-bold' : 'text-muted hover:text-fg'
                }`}
              >
                🇬🇧 English Preview
              </button>
            </div>
          </div>

          {/* Rendered Mini Footer Preview */}
          <div
            dir={previewLang === 'ar' ? 'rtl' : 'ltr'}
            className="rounded-2xl border border-border bg-surface-2/60 p-6 text-xs transition-all space-y-5"
          >
            <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
              {/* Col 1: Bio & hours */}
              <div className="space-y-2">
                <span className="font-extrabold text-sm text-fg tracking-tight">{brand.name}.</span>
                <p className="text-muted leading-relaxed">
                  {previewLang === 'ar'
                    ? contact.bioAr || 'منصة استكشاف وتحديد متطلبات المشاريع الذكية، مدعومة بالذكاء الاصطناعي.'
                    : contact.bioEn || 'AI-guided project discovery & requirements management platform.'}
                </p>
                {(contact.workingHoursAr || contact.workingHoursEn) && (
                  <div className="flex items-center gap-1.5 text-muted pt-1">
                    <Clock className="size-3.5 text-brand" />
                    <span>{previewLang === 'ar' ? contact.workingHoursAr || contact.workingHoursEn : contact.workingHoursEn || contact.workingHoursAr}</span>
                  </div>
                )}
              </div>

              {/* Col 2: Direct Contact */}
              <div className="space-y-2">
                <span className="font-bold text-fg block uppercase tracking-wider text-[11px]">
                  {previewLang === 'ar' ? 'بيانات التواصل' : 'Contact Information'}
                </span>
                <div className="space-y-1.5 text-muted">
                  {contact.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="size-3.5 text-brand" />
                      <span>{contact.email}</span>
                    </div>
                  )}
                  {contact.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="size-3.5 text-emerald-600" />
                      <span dir="ltr">{contact.phone}</span>
                    </div>
                  )}
                  {contact.whatsapp && (
                    <div className="flex items-center gap-2">
                      <MessageCircle className="size-3.5 text-emerald-500" />
                      <span dir="ltr">{contact.whatsapp}</span>
                    </div>
                  )}
                  {(contact.addressAr || contact.addressEn) && (
                    <div className="flex items-center gap-2">
                      <MapPin className="size-3.5 text-rose-500 shrink-0" />
                      <span>{previewLang === 'ar' ? contact.addressAr || contact.addressEn : contact.addressEn || contact.addressAr}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Col 3: Social & Links */}
              <div className="space-y-2">
                <span className="font-bold text-fg block uppercase tracking-wider text-[11px]">
                  {previewLang === 'ar' ? 'روابط المنصة والشبكات' : 'Platform & Social'}
                </span>
                <div className="flex flex-wrap gap-2 pt-1">
                  {contact.twitter && <span className="rounded-lg bg-surface px-2.5 py-1 text-[11px] font-mono ring-1 ring-border">X/Twitter</span>}
                  {contact.linkedin && <span className="rounded-lg bg-surface px-2.5 py-1 text-[11px] font-mono ring-1 ring-border">LinkedIn</span>}
                  {contact.instagram && <span className="rounded-lg bg-surface px-2.5 py-1 text-[11px] font-mono ring-1 ring-border">Instagram</span>}
                  {contact.github && <span className="rounded-lg bg-surface px-2.5 py-1 text-[11px] font-mono ring-1 ring-border">GitHub</span>}
                  {!contact.twitter && !contact.linkedin && !contact.instagram && !contact.github && (
                    <span className="text-muted italic">{previewLang === 'ar' ? 'لم تتم إضافة روابط سوشيال بعد' : 'No social links yet'}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Save Action Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="submit"
            size="lg"
            loading={isPending}
            leftIcon={<Save className="size-4" />}
            className="shadow-md shadow-brand/20"
          >
            {isAr ? 'حفظ بيانات التواصل وروابط الفوتر' : 'Save Contact & Footer Info'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
