import type { ComponentProps, ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Dialog, DropdownMenu, Tooltip as RTooltip } from 'radix-ui';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useI18n } from '../../lib/i18n';

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = 'md',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}) {
  const widths = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl' };
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild>
              <motion.div
                className={cn(
                  'fixed top-1/2 left-1/2 z-50 max-h-[90vh] w-[calc(100vw-2rem)] overflow-y-auto rounded-2xl bg-surface shadow-lg ring-1 ring-border focus:outline-none',
                  widths[size],
                )}
                initial={{ opacity: 0, scale: 0.96, x: '-50%', y: '-48%' }}
                animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
                exit={{ opacity: 0, scale: 0.97, x: '-50%', y: '-48%' }}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              >
                <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
                  <div>
                    <Dialog.Title className="text-base font-semibold text-fg">{title}</Dialog.Title>
                    {description ? (
                      <Dialog.Description className="mt-1 text-sm text-muted">{description}</Dialog.Description>
                    ) : (
                      <Dialog.Description className="sr-only">{typeof title === 'string' ? title : ''}</Dialog.Description>
                    )}
                  </div>
                  <Dialog.Close className="rounded-lg p-1 text-muted hover:bg-surface-2 hover:text-fg">
                    <X className="size-4" />
                  </Dialog.Close>
                </div>
                {children && <div className="px-6 py-5">{children}</div>}
                {footer && <div className="flex justify-end gap-2 border-t border-border bg-surface-2/50 px-6 py-4">{footer}</div>}
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}

export function Drawer({
  open,
  onOpenChange,
  title,
  children,
  side = 'end',
  width = 'max-w-md',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  children: ReactNode;
  side?: 'start' | 'end';
  width?: string;
}) {
  const { dir } = useI18n();
  const fromRight = (side === 'end') === (dir === 'ltr');
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div className="fixed inset-0 z-50 bg-black/30" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            </Dialog.Overlay>
            <Dialog.Content asChild>
              <motion.div
                className={cn(
                  'fixed inset-y-0 z-50 flex w-full flex-col bg-surface shadow-lg ring-1 ring-border focus:outline-none',
                  width,
                  fromRight ? 'right-0' : 'left-0',
                )}
                initial={{ x: fromRight ? '100%' : '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: fromRight ? '100%' : '-100%' }}
                transition={{ type: 'spring', stiffness: 360, damping: 36 }}
              >
                <Dialog.Title className="sr-only">{title}</Dialog.Title>
                <Dialog.Description className="sr-only">{typeof title === 'string' ? title : ''}</Dialog.Description>
                {children}
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}

export const Menu = {
  Root: ({ modal = false, ...props }: ComponentProps<typeof DropdownMenu.Root>) => (
    <DropdownMenu.Root modal={modal} {...props} />
  ),
  Trigger: DropdownMenu.Trigger,
  Content({
    children,
    align = 'end',
    side = 'bottom',
    sideOffset = 6,
    collisionPadding = 8,
    className,
  }: {
    children: ReactNode;
    align?: 'start' | 'end' | 'center';
    side?: 'top' | 'bottom' | 'left' | 'right';
    sideOffset?: number;
    collisionPadding?: number;
    className?: string;
  }) {
    return (
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align={align}
          side={side}
          sideOffset={sideOffset}
          collisionPadding={collisionPadding}
          className={cn(
            'z-50 min-w-48 rounded-xl bg-surface p-1.5 shadow-lg ring-1 ring-border',
            'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[side=bottom]:origin-top data-[side=bottom]:slide-in-from-top-2',
            'data-[side=top]:origin-bottom data-[side=top]:slide-in-from-bottom-2',
            'data-[side=left]:origin-right data-[side=left]:slide-in-from-right-2',
            'data-[side=right]:origin-left data-[side=right]:slide-in-from-left-2',
            className,
          )}
        >
          {children}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    );
  },
  Item({ children, onSelect, icon, danger }: { children: ReactNode; onSelect?: () => void; icon?: ReactNode; danger?: boolean }) {
    return (
      <DropdownMenu.Item
        onSelect={onSelect}
        className={cn(
          'flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] outline-none select-none data-[highlighted]:bg-surface-2',
          danger ? 'text-danger' : 'text-fg-2 data-[highlighted]:text-fg',
        )}
      >
        {icon && <span className="text-muted [&>svg]:size-4">{icon}</span>}
        {children}
      </DropdownMenu.Item>
    );
  },
  Label({ children }: { children: ReactNode }) {
    return <DropdownMenu.Label className="px-2.5 pt-1.5 pb-1 text-[11px] font-semibold tracking-wide text-muted uppercase">{children}</DropdownMenu.Label>;
  },
  Separator() {
    return <DropdownMenu.Separator className="my-1 h-px bg-border" />;
  },
};

export function Tooltip({ content, children, side = 'top' }: { content: ReactNode; children: ReactNode; side?: 'top' | 'bottom' | 'left' | 'right' }) {
  return (
    <RTooltip.Provider delayDuration={250}>
      <RTooltip.Root>
        <RTooltip.Trigger asChild>{children}</RTooltip.Trigger>
        <RTooltip.Portal>
          <RTooltip.Content side={side} sideOffset={6} className="z-50 max-w-xs rounded-lg bg-fg px-2.5 py-1.5 text-xs text-bg shadow-md">
            {content}
          </RTooltip.Content>
        </RTooltip.Portal>
      </RTooltip.Root>
    </RTooltip.Provider>
  );
}
