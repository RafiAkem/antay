import type { FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardHead } from '@/components/ui/card'
import type { ApiError } from '@/lib/api'
import type { Ticket, TicketCheck } from '@/types/api'
import { LookupNotices } from './lookup-notices'
import { RedeemCard } from './redeem-card'

export type LookupResult = { ticket: Ticket; check: TicketCheck }

type Props = {
  code: string
  item: string
  checking: boolean
  redeeming: boolean
  ktpChecked: boolean
  result: LookupResult | null
  error: ApiError | null
  onCodeChange: (value: string) => void
  onCheck: (event: FormEvent<HTMLFormElement>) => void
  onKtpChange: (checked: boolean) => void
  onRedeem: () => void
  onCancel: () => void
}

export function TicketLookup({
  code,
  item,
  checking,
  redeeming,
  ktpChecked,
  result,
  error,
  onCodeChange,
  onCheck,
  onKtpChange,
  onRedeem,
  onCancel,
}: Props) {
  const ticket = result?.ticket
  const check = result?.check
  const valid = check?.canRedeem && !check.wrongEvent && !check.alreadyRedeemed

  return (
    <Card>
      <CardHead title="Cek tiket" meta="kode di bawah QR" />
      <form className="grid grid-cols-[minmax(0,1fr)_auto] gap-2" noValidate onSubmit={onCheck}>
        {/* Input sendiri, bukan Input dari ui: kodenya harus besar dan berhuruf
            mono supaya petugas bisa mencocokkan dengan layar ponsel pengunjung. */}
        <input
          id="ticket-code"
          value={code}
          onChange={(event) => onCodeChange(event.target.value)}
          placeholder="RF-7K2Q"
          aria-label="Kode tiket"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={8}
          className="h-12 w-full min-w-0 rounded-control border border-control bg-surface px-3 font-mono text-xl tracking-[0.06em] uppercase placeholder:text-faint focus:border-accent"
        />
        <Button type="submit" size="large" disabled={checking || !code.trim()}>
          {checking ? 'Memeriksa...' : 'Cek'}
        </Button>
      </form>

      <div className="mt-3.5 grid gap-3" aria-live="polite">
        <LookupNotices error={error} ticket={ticket ?? null} check={check ?? null} item={item} />
        {ticket && check && valid ? (
          <RedeemCard
            ticket={ticket}
            check={check}
            item={item}
            ktpChecked={ktpChecked}
            redeeming={redeeming}
            onKtpChange={onKtpChange}
            onRedeem={onRedeem}
            onCancel={onCancel}
          />
        ) : null}
      </div>
    </Card>
  )
}
