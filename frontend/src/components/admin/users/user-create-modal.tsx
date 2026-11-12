import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/field'
import { Modal } from '@/components/ui/modal'
import { Select } from '@/components/ui/select'
import type { ManagedUser, Organizer } from '@/types/accounts'
import type { Role } from '@/types/api'
import { FormRow } from '../shared/form-row'
import { ROLE_HINT, ROLE_OPTIONS } from './user-labels'
import { useUserCreateForm } from './use-user-create-form'

type Props = {
  organizers: Organizer[]
  organizersLoading: boolean
  organizersError: string | null
  onRetryOrganizers: () => void
  onCreated: (user: ManagedUser) => void
  onOrganizersStale: () => void
  onClose: () => void
}

const FORM_ID = 'user-create-form'

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p id={id} className="text-[13px] leading-[18px] text-negative">
      {message}
    </p>
  )
}

export function UserCreateModal({
  organizers,
  organizersLoading,
  organizersError,
  onRetryOrganizers,
  onCreated,
  onOrganizersStale,
  onClose,
}: Props) {
  const form = useUserCreateForm({ onCreated, onOrganizersStale })
  const { values, errors } = form
  // Server menolak penyelenggara nonaktif, jadi yang nonaktif tidak ditawarkan.
  const options = organizers.filter((item) => item.isActive).map((item) => ({ value: item.id, label: item.name }))
  const empty = !values.name.trim() && !values.email.trim() && !values.password

  return (
    <Modal
      open
      width="lg"
      title="Tambah akun"
      description="Kata sandi awal diberikan langsung ke pemilik akun. Minta mereka menyimpannya; admin bisa mengatur ulang kapan saja."
      onClose={form.busy ? () => undefined : onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={form.busy}>
            Batal
          </Button>
          <Button type="submit" form={FORM_ID} disabled={form.busy || empty}>
            {form.busy ? 'Menyimpan...' : 'Buat akun'}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} noValidate onSubmit={form.submit} className="grid gap-4 sm:grid-cols-2">
        <div id="user-role" className="grid gap-1.5 sm:col-span-2">
          <Select
            label="Peran"
            value={values.role}
            options={ROLE_OPTIONS}
            onChange={(value) => form.changeRole(value as Role)}
          />
          <p className="text-[13px] leading-[18px] text-muted">{ROLE_HINT[values.role]}</p>
          <FieldError id="user-role-error" message={errors.role} />
        </div>

        {values.role === 'organizer' ? (
          <div id="user-organizer" className="grid gap-1.5 sm:col-span-2">
            <Select
              label="Penyelenggara"
              value={values.organizerId}
              options={options}
              onChange={(value) => form.change('organizerId', value)}
              placeholder={organizersLoading ? 'Memuat penyelenggara...' : options.length === 0 ? 'Belum ada penyelenggara aktif' : 'Pilih penyelenggara'}
              disabled={organizersLoading || options.length === 0}
            />
            {organizersError ? (
              <p className="text-[13px] leading-[18px] text-negative">
                {organizersError}{' '}
                <button type="button" onClick={onRetryOrganizers} className="font-semibold underline">
                  Muat ulang
                </button>
              </p>
            ) : !organizersLoading && options.length === 0 ? (
              <p className="text-[13px] leading-[18px] text-muted">
                Tambahkan penyelenggaranya dulu di{' '}
                <Link to="/admin/organizers" className="font-semibold text-accent-ink hover:underline">
                  halaman Penyelenggara
                </Link>
                , lalu kembali ke sini.
              </p>
            ) : null}
            <FieldError id="user-organizer-error" message={errors.organizerId} />
          </div>
        ) : null}

        <FormRow id="user-name" label="Nama" error={errors.name}>
          <Input
            id="user-name"
            value={values.name}
            onChange={(event) => form.change('name', event.target.value)}
            error={Boolean(errors.name)}
            aria-describedby={errors.name ? 'user-name-error' : undefined}
            maxLength={80}
            placeholder="contoh: Rina Kusuma"
          />
        </FormRow>
        <FormRow id="user-email" label="Email untuk masuk" error={errors.email}>
          <Input
            id="user-email"
            type="email"
            inputMode="email"
            autoComplete="off"
            value={values.email}
            onChange={(event) => form.change('email', event.target.value)}
            error={Boolean(errors.email)}
            aria-describedby={errors.email ? 'user-email-error' : undefined}
            placeholder="rina@antay.id"
          />
        </FormRow>
        <FormRow
          id="user-password"
          label="Kata sandi awal"
          error={errors.password}
          hint="Minimal 8 karakter."
          className="sm:col-span-2"
        >
          <Input
            id="user-password"
            type="password"
            autoComplete="new-password"
            value={values.password}
            onChange={(event) => form.change('password', event.target.value)}
            error={Boolean(errors.password)}
            aria-describedby={errors.password ? 'user-password-error' : undefined}
          />
        </FormRow>
      </form>
    </Modal>
  )
}
