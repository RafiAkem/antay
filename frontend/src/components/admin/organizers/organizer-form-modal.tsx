import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/field'
import { Modal } from '@/components/ui/modal'
import type { Organizer } from '@/types/accounts'
import { FormRow } from '../shared/form-row'
import { useOrganizerForm } from './use-organizer-form'

type Props = {
  row: Organizer | null
  onSaved: (saved: Organizer, created: boolean) => void
  onClose: (reload: boolean) => void
}

const FORM_ID = 'organizer-form'

export function OrganizerFormModal({ row, onSaved, onClose }: Props) {
  const form = useOrganizerForm(row, { onSaved, onClose })
  const empty = !form.values.name.trim() && !form.values.contactEmail.trim()

  return (
    <Modal
      open
      title={row ? `Ubah ${row.name}` : 'Tambah penyelenggara'}
      description={
        row
          ? 'Perubahan nama langsung terlihat di event milik penyelenggara ini.'
          : 'EO, klub, atau promotor yang menyewa tempat di mal. Akun login-nya dibuat terpisah di halaman Akun.'
      }
      onClose={form.busy ? () => undefined : () => onClose(false)}
      footer={
        <>
          <Button variant="ghost" onClick={() => onClose(false)} disabled={form.busy}>
            Batal
          </Button>
          <Button type="submit" form={FORM_ID} disabled={form.busy || empty}>
            {form.busy ? 'Menyimpan...' : row ? 'Simpan perubahan' : 'Tambah penyelenggara'}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} noValidate onSubmit={form.submit} className="grid gap-4">
        <FormRow id="organizer-name" label="Nama penyelenggara" error={form.errors.name}>
          <Input
            id="organizer-name"
            value={form.values.name}
            onChange={(event) => form.change('name', event.target.value)}
            error={Boolean(form.errors.name)}
            aria-describedby={form.errors.name ? 'organizer-name-error' : undefined}
            maxLength={100}
            placeholder="contoh: Persib Store Official"
            autoFocus
          />
        </FormRow>
        <FormRow id="organizer-email" label="Email kontak" error={form.errors.contactEmail}>
          <Input
            id="organizer-email"
            type="email"
            inputMode="email"
            autoComplete="off"
            value={form.values.contactEmail}
            onChange={(event) => form.change('contactEmail', event.target.value)}
            error={Boolean(form.errors.contactEmail)}
            aria-describedby={form.errors.contactEmail ? 'organizer-email-error' : undefined}
            placeholder="tim@penyelenggara.id"
          />
        </FormRow>
        <FormRow
          id="organizer-phone"
          label="Nomor WhatsApp (opsional)"
          error={form.errors.contactPhone}
          hint="Dipakai admin mal untuk menghubungi saat ada kendala di loket."
        >
          <Input
            id="organizer-phone"
            type="tel"
            inputMode="tel"
            value={form.values.contactPhone}
            onChange={(event) => form.change('contactPhone', event.target.value)}
            error={Boolean(form.errors.contactPhone)}
            aria-describedby={form.errors.contactPhone ? 'organizer-phone-error' : undefined}
            placeholder="0812 3456 7890"
          />
        </FormRow>
      </form>
    </Modal>
  )
}
