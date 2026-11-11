import { useState, type InputHTMLAttributes } from 'react'
import { Input } from '@/components/ui/field'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { error?: boolean }

// Tombol lihat sandi penting di ponsel: salah ketik di keyboard kecil sering
// baru ketahuan setelah ditolak server.
export function PasswordInput({ error, className, ...rest }: Props) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <Input {...rest} type={visible ? 'text' : 'password'} error={error} className={`pr-16 ${className ?? ''}`} />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        aria-pressed={visible}
        aria-label={visible ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
        disabled={rest.disabled}
        className="absolute inset-y-1 right-1 rounded-tag px-2.5 text-[13px] font-semibold text-accent-ink hover:bg-tint-50 focus-visible:outline-2 focus-visible:outline-accent disabled:text-faint"
      >
        {visible ? 'Tutup' : 'Lihat'}
      </button>
    </div>
  )
}
