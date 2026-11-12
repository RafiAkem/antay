import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/field'
import { Modal } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { updateUser } from '@/lib/accounts-api'
import { ApiError } from '@/lib/api'
import type { ManagedUser } from '@/types/accounts'
import { FormRow } from '../shared/form-row'
import { messageOf, passwordIssue, serverFieldErrors } from '../shared/validation'

type Props = {
  user: ManagedUser
  onDone: (user: ManagedUser) => void
  onClose: (reload: boolean) => void
}

const FORM_ID = 'user-password-form'

// Diketik dua kali karena admin biasanya mendiktekan kata sandi baru lewat
// telepon atau chat; salah satu huruf berarti pemilik akun tetap terkunci.
export function PasswordModal({ user, onDone, onClose }: Props) {
  const toast = useToast()
  const [password, setPassword] = useState('')
  const [repeat, setRepeat] = useState('')
  const [errors, setErrors] = useState<{ password?: string; repeat?: string }>({})
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    const issue = passwordIssue(password)
    const next = {
      password: issue ?? undefined,
      repeat: !issue && repeat !== password ? 'Belum sama dengan kata sandi di atas.' : undefined,
    }
    if (next.password || next.repeat) {
      setErrors(next)
      document.getElementById(next.password ? 'reset-password' : 'reset-repeat')?.focus()
      toast.error('Periksa isian yang ditandai merah.')
      return
    }
    setBusy(true)
    try {
      onDone(await updateUser(user.id, { password }))
    } catch (cause) {
      const fields = serverFieldErrors(cause)
      if (fields.password) {
        setErrors({ password: fields.password })
        document.getElementById('reset-password')?.focus()
        toast.error('Server menolak kata sandi ini.')
      } else if (cause instanceof ApiError && cause.status === 404) {
        toast.error('Akun ini sudah tidak ada. Daftar dimuat ulang.')
        onClose(true)
      } else {
        toast.error(messageOf(cause, 'Kata sandi gagal diganti. Coba lagi.'))
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open
      title={`Atur ulang kata sandi ${user.name}`}
      description={`Kata sandi lama ${user.email} langsung tidak berlaku. Berikan yang baru ke pemilik akun secara langsung.`}
      onClose={busy ? () => undefined : () => onClose(false)}
      footer={
        <>
          <Button variant="ghost" onClick={() => onClose(false)} disabled={busy}>
            Batal
          </Button>
          <Button type="submit" form={FORM_ID} disabled={busy || !password}>
            {busy ? 'Menyimpan...' : 'Simpan kata sandi'}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} noValidate onSubmit={submit} className="grid gap-4">
        <FormRow id="reset-password" label="Kata sandi baru" error={errors.password} hint="Minimal 8 karakter.">
          <Input
            id="reset-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value)
              setErrors({})
            }}
            error={Boolean(errors.password)}
            aria-describedby={errors.password ? 'reset-password-error' : undefined}
            autoFocus
          />
        </FormRow>
        <FormRow id="reset-repeat" label="Ulangi kata sandi baru" error={errors.repeat}>
          <Input
            id="reset-repeat"
            type="password"
            autoComplete="new-password"
            value={repeat}
            onChange={(event) => {
              setRepeat(event.target.value)
              setErrors((prev) => ({ ...prev, repeat: undefined }))
            }}
            error={Boolean(errors.repeat)}
            aria-describedby={errors.repeat ? 'reset-repeat-error' : undefined}
          />
        </FormRow>
      </form>
    </Modal>
  )
}
