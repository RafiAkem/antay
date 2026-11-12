import { Button } from '@/components/ui/button'
import { Pill } from '@/components/ui/pill'
import type { ManagedUser } from '@/types/accounts'
import { ROLE_LABEL } from './user-labels'

type Props = {
  rows: ManagedUser[]
  meId: string | null
  organizerNames: Map<string, string>
  onReset: (row: ManagedUser) => void
  onToggle: (row: ManagedUser) => void
}

type RowProps = Omit<Props, 'rows'> & { row: ManagedUser }

function roleLine(row: ManagedUser, organizerNames: Map<string, string>): string {
  if (row.role !== 'organizer') return ROLE_LABEL[row.role]
  const name = row.organizerId ? organizerNames.get(row.organizerId) : undefined
  return name ? `${ROLE_LABEL.organizer} · ${name}` : ROLE_LABEL.organizer
}

function StatusPill({ active }: { active: boolean }) {
  return <Pill tone={active ? 'ok' : 'neutral'}>{active ? 'Aktif' : 'Nonaktif'}</Pill>
}

// Akun sendiri tidak bisa dinonaktifkan (server juga menolak), jadi tombolnya
// diganti keterangan, bukan disembunyikan diam-diam.
function Actions({ row, meId, onReset, onToggle }: RowProps) {
  const self = row.id === meId
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="ghost" size="small" onClick={() => onReset(row)} aria-label={`Atur ulang kata sandi ${row.name}`}>
        Atur ulang sandi
      </Button>
      {self ? (
        <span className="px-1 text-xs text-muted">Akun kamu</span>
      ) : (
        <Button
          variant={row.isActive ? 'ghost' : 'tint'}
          size="small"
          onClick={() => onToggle(row)}
          aria-label={`${row.isActive ? 'Nonaktifkan' : 'Aktifkan'} akun ${row.name}`}
        >
          {row.isActive ? 'Nonaktifkan' : 'Aktifkan'}
        </Button>
      )}
    </div>
  )
}

export function UserList(props: Props) {
  const { rows, organizerNames } = props

  return (
    <>
      <ul className="grid gap-3 sm:grid-cols-2 lg:hidden">
        {rows.map((row) => (
          <li key={row.id} className="grid content-start gap-3 rounded-card border border-border-soft bg-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="grid min-w-0 gap-0.5">
                <b className="text-[15px] leading-[22px] font-bold break-words">{row.name}</b>
                <span className="truncate text-[13px] text-muted">{row.email}</span>
              </div>
              <StatusPill active={row.isActive} />
            </div>
            <p className="text-[13px] font-semibold">{roleLine(row, organizerNames)}</p>
            <Actions {...props} row={row} />
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto rounded-card border border-border-soft bg-surface lg:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-raised text-xs text-muted">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold">Nama</th>
              <th scope="col" className="px-4 py-3 font-semibold">Email</th>
              <th scope="col" className="px-4 py-3 font-semibold">Peran</th>
              <th scope="col" className="px-4 py-3 font-semibold">Status</th>
              <th scope="col" className="px-4 py-3 font-semibold"><span className="sr-only">Aksi</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-border-soft align-middle">
                <th scope="row" className="max-w-[240px] px-4 py-3 font-semibold">{row.name}</th>
                <td className="max-w-[260px] truncate px-4 py-3">{row.email}</td>
                <td className="max-w-[260px] px-4 py-3">{roleLine(row, organizerNames)}</td>
                <td className="px-4 py-3"><StatusPill active={row.isActive} /></td>
                <td className="px-4 py-3">
                  <div className="flex justify-end">
                    <Actions {...props} row={row} />
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
