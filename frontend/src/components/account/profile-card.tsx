import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Heading, Label } from '@/components/ui/text'
import type { Customer } from '@/types/catalog'
import { Avatar } from './avatar'
import { ProfileForm } from './profile-form'

const EDIT_ID = 'profile-edit'

export function ProfileCard({ customer }: { customer: Customer }) {
  const [editing, setEditing] = useState(false)

  // Tombol Ubah hilang selama form terbuka, jadi fokus dikembalikan ke sana saat form ditutup.
  function close() {
    setEditing(false)
    window.requestAnimationFrame(() => document.getElementById(EDIT_ID)?.focus())
  }

  return (
    <Card>
      <div className="flex items-center gap-4">
        <Avatar name={customer.name} email={customer.email} size="lg" />
        <div className="min-w-0 flex-1">
          <Heading level={2} size="lg" className="truncate">
            {customer.name || 'Tanpa nama'}
          </Heading>
          <p className="truncate text-sm leading-[21px] text-muted">{customer.email}</p>
        </div>
        {editing ? null : (
          <Button id={EDIT_ID} variant="ghost" size="small" onClick={() => setEditing(true)}>
            Ubah
          </Button>
        )}
      </div>

      <div className="mt-5 border-t border-border-soft pt-5">
        {editing ? (
          <ProfileForm customer={customer} onDone={close} />
        ) : (
          <dl className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1">
              <dt>
                <Label>Nomor WhatsApp</Label>
              </dt>
              <dd className="font-mono text-[15px] leading-[22px]">{customer.phone || 'Belum diisi'}</dd>
            </div>
            <div className="grid gap-1">
              <dt>
                <Label>Email masuk</Label>
              </dt>
              <dd className="text-[15px] leading-[22px] break-all">{customer.email}</dd>
            </div>
          </dl>
        )}
      </div>
    </Card>
  )
}
