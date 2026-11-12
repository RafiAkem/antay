import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/field'
import { Heading, Paragraph } from '@/components/ui/text'
import type { SeatStage } from '@/types/seating'
import { STAGE_MIN } from './seat-geometry'

type Props = {
  stage: SeatStage
  canvasWidth: number
  canvasHeight: number
  busy: boolean
  onSave: (stage: SeatStage) => void
}

type StageForm = { label: string; x: string; y: string; width: string; height: string }

function toForm(stage: SeatStage): StageForm {
  return { label: stage.label, x: String(stage.x), y: String(stage.y), width: String(stage.width), height: String(stage.height) }
}

function parse(form: StageForm, canvasWidth: number, canvasHeight: number): SeatStage | string {
  const label = form.label.trim()
  if (label.length < 1 || label.length > 40) return 'Label panggung 1 sampai 40 karakter.'
  const [x, y, width, height] = [form.x, form.y, form.width, form.height].map((value) =>
    /^\d+$/.test(value) ? Number(value) : NaN,
  )
  if ([x, y, width, height].some(Number.isNaN)) return 'Posisi dan ukuran panggung harus angka bulat.'
  if (width < STAGE_MIN.width || height < STAGE_MIN.height) return 'Panggung minimal 40 kali 20.'
  if (x + width > canvasWidth || y + height > canvasHeight) return 'Panggung harus berada di dalam kanvas.'
  return { label, x, y, width, height }
}

// Draf diikat ke isi panggung saat ini. Kalau panggung digeser di kanvas,
// kuncinya berubah dan isian otomatis ikut angka terbaru.
export function StagePanel({ stage, canvasWidth, canvasHeight, busy, onSave }: Props) {
  const key = JSON.stringify(stage)
  const [draft, setDraft] = useState<{ key: string; form: StageForm } | null>(null)
  const form = draft?.key === key ? draft.form : toForm(stage)
  const result = parse(form, canvasWidth, canvasHeight)
  const error = typeof result === 'string' ? result : null
  const dirty = draft?.key === key && JSON.stringify(toForm(stage)) !== JSON.stringify(form)

  const set = (patch: Partial<StageForm>) => setDraft({ key, form: { ...form, ...patch } })
  const digits = (value: string) => value.replace(/[^\d]/g, '')

  return (
    <div className="grid gap-4">
      <div className="grid gap-1">
        <Heading level={3} size="md">
          Panggung
        </Heading>
        <Paragraph tone="muted" size="sm">
          Seret panggung di kanvas untuk memindah, atau tarik kotak di sudutnya untuk mengubah ukuran.
        </Paragraph>
      </div>
      <Field label="Label" hint="Tampil di tengah panggung, juga di denah pembeli.">
        <Input value={form.label} maxLength={40} onChange={(event) => set({ label: event.target.value })} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Posisi X">
          <Input inputMode="numeric" className="font-mono" value={form.x} onChange={(event) => set({ x: digits(event.target.value) })} />
        </Field>
        <Field label="Posisi Y">
          <Input inputMode="numeric" className="font-mono" value={form.y} onChange={(event) => set({ y: digits(event.target.value) })} />
        </Field>
        <Field label="Lebar">
          <Input inputMode="numeric" className="font-mono" value={form.width} onChange={(event) => set({ width: digits(event.target.value) })} />
        </Field>
        <Field label="Tinggi">
          <Input inputMode="numeric" className="font-mono" value={form.height} onChange={(event) => set({ height: digits(event.target.value) })} />
        </Field>
      </div>
      {dirty && error ? <p className="text-[13px] text-negative">{error}</p> : null}
      <div className="flex gap-2 border-t border-border-soft pt-4">
        <Button
          disabled={!dirty || !!error || busy}
          onClick={() => {
            if (typeof result !== 'string') onSave(result)
          }}
        >
          {busy ? 'Menyimpan...' : 'Simpan panggung'}
        </Button>
        {dirty ? (
          <Button variant="ghost" onClick={() => setDraft(null)}>
            Batalkan
          </Button>
        ) : null}
      </div>
    </div>
  )
}
