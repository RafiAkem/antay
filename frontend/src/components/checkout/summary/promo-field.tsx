import { useId, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/field'
import { Label } from '@/components/ui/text'
import { promoRejectionText } from '../checkout-labels'

type PromoFieldProps = {
  // kode yang sudah ditekan Pakai dan ikut dikirim ke quote
  applied: string
  // checking: quote sedang dihitung; settled: quote segar sudah ada. Tanpa
  // settled, galat jaringan bisa terbaca seolah kodenya terpasang.
  checking: boolean
  settled: boolean
  // alasan penolakan dari quote yang segar
  rejection: string | null
  onApply: (code: string) => void
  onClear: () => void
}

// Kode baru dikirim ke server saat "Pakai" ditekan, bukan di setiap ketukan,
// supaya pembeli tidak melihat pesan "tidak dikenal" saat kodenya belum selesai diketik.
export function PromoField({ applied, checking, settled, rejection, onApply, onClear }: PromoFieldProps) {
  const id = useId()
  const [draft, setDraft] = useState(applied)
  const trimmed = draft.trim()
  const unchanged = trimmed.toUpperCase() === applied.trim().toUpperCase()
  const accepted = applied !== '' && settled && rejection === null

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (trimmed && !unchanged) onApply(trimmed)
  }

  const clear = () => {
    setDraft('')
    onClear()
  }

  return (
    <form onSubmit={submit} className="grid gap-1.5">
      <Label htmlFor={id} className="text-[13px] text-ink">
        Kode promo
      </Label>
      <div className="flex gap-2">
        <Input
          id={id}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          error={settled && rejection !== null && unchanged}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          maxLength={40}
          placeholder="Masukkan kode"
          className="font-mono uppercase placeholder:font-sans placeholder:normal-case"
        />
        <Button type="submit" variant="tint" disabled={!trimmed || unchanged} className="h-11! sm:h-10!">
          Pakai
        </Button>
        {applied ? (
          <Button variant="ghost" onClick={clear} className="h-11! sm:h-10!">
            Hapus
          </Button>
        ) : null}
      </div>
      <p aria-live="polite" className="min-h-[18px] text-[13px]">
        {applied && checking ? <span className="text-muted">Memeriksa kode {applied.toUpperCase()}.</span> : null}
        {applied && settled && rejection ? <span className="text-negative">{promoRejectionText(rejection)}</span> : null}
        {accepted ? <span className="text-positive">Kode {applied.toUpperCase()} terpasang.</span> : null}
      </p>
    </form>
  )
}
