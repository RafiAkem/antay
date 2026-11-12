import { useId } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { cn } from '@/components/ui/cn'
import type { Customer } from '@/types/catalog'
import { firstName } from './auth-rules'
import { Avatar } from './avatar'
import { useLogout } from './use-logout'
import { useMenuPopover } from './use-menu-popover'

type Props = {
  customer: Customer
  // solid: header sudah putih. Selain itu header masih transparan di atas foto hero.
  solid: boolean
}

const ITEM =
  'flex h-11 w-full items-center px-4 text-left text-sm font-semibold text-ink outline-none hover:bg-raised focus:bg-tint-50 focus:text-accent-ink'

export function AccountMenu({ customer, solid }: Props) {
  const { open, toggle, close, triggerRef, panelRef, onTriggerKeyDown, onPanelKeyDown } = useMenuPopover()
  const { busy, logout } = useLogout()
  const panelId = useId()
  const shortName = firstName(customer.name, customer.email)

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={`Menu akun ${shortName}`}
        onClick={toggle}
        onKeyDown={onTriggerKeyDown}
        className={cn(
          'ml-auto inline-flex h-9 max-w-[180px] flex-none items-center gap-2 rounded-pill border py-1 pr-3 pl-1 text-[13px] font-semibold transition-colors',
          solid ? 'border-control text-ink hover:bg-raised' : 'border-white/60 text-white hover:bg-white/10',
          open && (solid ? 'bg-raised' : 'bg-white/10'),
        )}
      >
        <Avatar name={customer.name} email={customer.email} onDark={!solid} />
        <span className="truncate">{shortName}</span>
      </button>

      {open
        ? createPortal(
            <div
              ref={panelRef}
              id={panelId}
              onKeyDown={onPanelKeyDown}
              style={{ visibility: 'hidden' }}
              className="fixed z-40 w-64 overflow-hidden rounded-card border border-border-soft bg-surface py-1 text-ink shadow-lg motion-safe:animate-fade-in"
            >
              <div className="border-b border-border-soft px-4 pt-2.5 pb-3">
                <b className="block truncate text-sm leading-5 font-semibold">{customer.name || shortName}</b>
                <span className="block truncate text-[13px] leading-[19px] text-muted">{customer.email}</span>
              </div>
              <div role="menu" aria-label="Menu akun" className="py-1">
                <Link to="/tickets" role="menuitem" tabIndex={-1} className={ITEM} onClick={() => close(false)}>
                  Tiket saya
                </Link>
                <Link to="/account" role="menuitem" tabIndex={-1} className={ITEM} onClick={() => close(false)}>
                  Akun
                </Link>
                <div role="separator" className="my-1 border-t border-border-soft" />
                <button
                  type="button"
                  role="menuitem"
                  tabIndex={-1}
                  disabled={busy}
                  className={cn(ITEM, 'text-negative disabled:text-faint')}
                  onClick={() => {
                    close(true)
                    void logout()
                  }}
                >
                  {busy ? 'Keluar...' : 'Keluar'}
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
