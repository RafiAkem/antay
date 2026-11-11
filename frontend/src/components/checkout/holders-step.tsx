import { useId } from 'react'
import { Input } from '@/components/ui/field'
import { Label, Paragraph } from '@/components/ui/text'

type HoldersStepProps = {
  holders: string[]
  onChange: (index: number, name: string) => void
}

// Satu input per orang. Nama dicocokkan dengan KTP saat penukaran di loket,
// jadi petunjuknya disebut di label, bukan disembunyikan di placeholder.
export function HoldersStep({ holders, onChange }: HoldersStepProps) {
  const baseId = useId()
  return (
    <div className="grid gap-4 rounded-card border border-border-soft bg-surface p-4 sm:p-5">
      <Paragraph tone="muted" size="sm">
        Tiap orang dapat e-ticket sendiri. Tulis nama sesuai KTP karena petugas loket mencocokkannya saat penukaran.
      </Paragraph>
      {holders.map((name, index) => {
        const id = `${baseId}-${index}`
        return (
          <div key={id} className="grid gap-1.5">
            <Label htmlFor={id} className="text-[13px] text-ink">
              Nama pemegang tiket {index + 1} sesuai KTP
            </Label>
            <Input
              id={id}
              value={name}
              onChange={(event) => onChange(index, event.target.value)}
              autoComplete={index === 0 ? 'name' : 'off'}
              autoCapitalize="words"
              maxLength={120}
              placeholder={index === 0 ? 'Namamu' : `Nama orang ke-${index + 1}`}
            />
          </div>
        )
      })}
    </div>
  )
}
