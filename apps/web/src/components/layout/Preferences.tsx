import { Languages, Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from '../../lib/theme';
import { useI18n } from '../../lib/i18n';
import { useLocaleSwitch } from '../../lib/auth';
import { Button } from '../ui/button';
import { Menu, Tooltip } from '../ui/overlay';

export function ThemeToggle() {
  const { theme, resolved, setTheme } = useTheme();
  const { t } = useI18n();
  return (
    <Menu.Root>
      <Tooltip content={t('common.theme')}>
        <Menu.Trigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={t('common.theme')}>
            {resolved === 'dark' ? <Moon className="size-4" /> : <Sun className="size-4" />}
          </Button>
        </Menu.Trigger>
      </Tooltip>
      <Menu.Content>
        {(
          [
            ['light', Sun],
            ['dark', Moon],
            ['system', Monitor],
          ] as const
        ).map(([value, Icon]) => (
          <Menu.Item key={value} icon={<Icon />} onSelect={() => setTheme(value)}>
            <span className={theme === value ? 'font-semibold text-fg' : ''}>{t(`common.${value}`)}</span>
          </Menu.Item>
        ))}
      </Menu.Content>
    </Menu.Root>
  );
}

export function LanguageToggle({ withLabel }: { withLabel?: boolean }) {
  const { locale, t } = useI18n();
  const switchLocale = useLocaleSwitch();
  const next = locale === 'ar' ? 'en' : 'ar';
  return (
    <Tooltip content={t('common.language')}>
      <Button variant="ghost" size={withLabel ? 'sm' : 'icon-sm'} onClick={() => switchLocale(next)} aria-label={t('common.language')}>
        <Languages className="size-4" />
        {withLabel && <span>{next === 'ar' ? 'العربية' : 'English'}</span>}
      </Button>
    </Tooltip>
  );
}
