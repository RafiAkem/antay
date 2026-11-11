import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

// Satu baris "Belum punya akun? Daftar" di bawah kartu masuk dan daftar.
export function AuthFooterLink({ prompt, to, children }: { prompt: string; to: string; children: ReactNode }) {
  return (
    <p>
      {prompt}{' '}
      <Link to={to} className="font-semibold text-accent-ink underline-offset-2 hover:underline">
        {children}
      </Link>
    </p>
  )
}
