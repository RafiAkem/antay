import { Button } from '@/components/ui/button'
import { Pill } from '@/components/ui/pill'
import type { Organizer } from '@/types/accounts'
import { phoneLabel } from './organizer-labels'

type Props = {
  rows: Organizer[]
  onEdit: (row: Organizer) => void
  onToggle: (row: Organizer) => void
}

function StatusPill({ active }: { active: boolean }) {
  return <Pill tone={active ? 'ok' : 'neutral'}>{active ? 'Aktif' : 'Nonaktif'}</Pill>
}

function Actions({ row, onEdit, onToggle }: { row: Organizer } & Omit<Props, 'rows'>) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="ghost" size="small" onClick={() => onEdit(row)} aria-label={`Ubah ${row.name}`}>
        Ubah
      </Button>
      <Button
        variant={row.isActive ? 'ghost' : 'tint'}
        size="small"
        onClick={() => onToggle(row)}
        aria-label={`${row.isActive ? 'Nonaktifkan' : 'Aktifkan'} ${row.name}`}
      >
        {row.isActive ? 'Nonaktifkan' : 'Aktifkan'}
      </Button>
    </div>
  )
}

// Tabel di desktop, kartu di bawah 1024px. Dua-duanya dirender dari data yang
// sama dan disembunyikan lewat CSS, jadi tidak ada matchMedia yang bisa telat.
export function OrganizerList({ rows, onEdit, onToggle }: Props) {
  return (
    <>
      <ul className="grid gap-3 sm:grid-cols-2 lg:hidden">
        {rows.map((row) => (
          <li key={row.id} className="grid content-start gap-3 rounded-card border border-border-soft bg-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <b className="min-w-0 text-[15px] leading-[22px] font-bold break-words">{row.name}</b>
              <StatusPill active={row.isActive} />
            </div>
            <dl className="grid gap-1 text-[13px] leading-[18px]">
              <dt className="sr-only">Email kontak</dt>
              <dd className="truncate">{row.contactEmail}</dd>
              <dt className="sr-only">WhatsApp</dt>
              <dd className="num text-muted">{phoneLabel(row.contactPhone) || 'Nomor WhatsApp belum diisi'}</dd>
            </dl>
            <Actions row={row} onEdit={onEdit} onToggle={onToggle} />
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto rounded-card border border-border-soft bg-surface lg:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-raised text-xs text-muted">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold">Penyelenggara</th>
              <th scope="col" className="px-4 py-3 font-semibold">Email kontak</th>
              <th scope="col" className="px-4 py-3 font-semibold">WhatsApp</th>
              <th scope="col" className="px-4 py-3 font-semibold">Status</th>
              <th scope="col" className="px-4 py-3 font-semibold"><span className="sr-only">Aksi</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-border-soft align-middle">
                <th scope="row" className="max-w-[280px] px-4 py-3 font-semibold">{row.name}</th>
                <td className="max-w-[260px] truncate px-4 py-3">{row.contactEmail}</td>
                <td className="num px-4 py-3 whitespace-nowrap text-muted">{phoneLabel(row.contactPhone) || '-'}</td>
                <td className="px-4 py-3"><StatusPill active={row.isActive} /></td>
                <td className="px-4 py-3">
                  <div className="flex justify-end">
                    <Actions row={row} onEdit={onEdit} onToggle={onToggle} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
