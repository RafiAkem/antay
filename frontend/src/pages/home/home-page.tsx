import { Link } from 'react-router-dom'
import { SampleTicket } from '@/components/home/sample-ticket'

const STEPS = [
  {
    title: 'Pilih event dan jam datang',
    body: 'Lihat event hari ini, lalu pilih slot jam yang masih ada kuotanya.',
  },
  {
    title: 'Isi nama sesuai KTP',
    body: 'Pesan tiket, lalu simpan kode dan QR yang muncul. Tidak perlu akun.',
  },
  {
    title: 'Datang di jam itu',
    body: 'Tunjukkan QR dan KTP asli di loket. Nomor KTP tidak disimpan.',
  },
]

const DESKS = [
  {
    title: 'Loket penukaran',
    body: 'Petugas cek kode, cocokkan nama dengan KTP, lalu serahkan item.',
  },
  {
    title: 'Papan antrean',
    body: 'Layar TV di area loket menampilkan antrean dan perkiraan tunggu.',
  },
  {
    title: 'Dasbor mal',
    body: 'Pengelola memantau kuota per slot dan ringkasan semua event.',
  },
]

const PRIMARY_LINK =
  'inline-flex h-[38px] items-center justify-center rounded-[var(--radius-control)] border border-transparent bg-accent px-4 text-sm font-semibold whitespace-nowrap text-white transition-colors hover:bg-accent-ink'

const GHOST_LINK =
  'inline-flex h-[38px] items-center justify-center rounded-[var(--radius-control)] border border-control bg-surface px-4 text-sm font-semibold whitespace-nowrap text-ink transition-colors hover:bg-raised'

export function HomePage() {
  return (
    <div className="grid gap-10">
      <section className="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_340px] lg:items-center lg:gap-12">
        <div className="grid justify-items-start gap-4">
          <span className="inline-flex items-center rounded-full bg-tint-100 px-3 py-1 text-xs font-medium text-accent-ink">
            Tiket penukaran event
          </span>
          <h1 className="max-w-[18ch] text-3xl leading-[1.15] font-semibold tracking-[-0.02em] sm:text-4xl">
            Tukar item event tanpa ikut antre panjang.
          </h1>
          <p className="max-w-[52ch] text-[15px] leading-6 text-muted">
            Antay membagi penukaran jadi slot jam datang, jadi kamu tahu persis kapan harus ke loket.
            Pilih jam yang masih ada kuotanya, pesan tiket, lalu datang membawa QR dan KTP.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Link to="/events" className={PRIMARY_LINK}>
              Lihat event hari ini
            </Link>
            <Link to="/board" className={GHOST_LINK}>
              Buka papan antrean
            </Link>
          </div>
        </div>
        <SampleTicket />
      </section>

      <section aria-labelledby="cara-pakai" className="grid gap-4 border-t border-border-soft pt-8">
        <div className="grid gap-1">
          <h2 id="cara-pakai" className="text-xl font-semibold tracking-[-0.01em]">
            Cara pakai
          </h2>
          <p className="text-sm text-muted">Dari memilih jam sampai tiba di loket, untuk pengunjung.</p>
        </div>

        <ol className="grid gap-3 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <li
              key={step.title}
              className="grid content-start gap-2 rounded-[var(--radius-card)] border border-border-soft bg-surface p-5"
            >
              <span
                aria-hidden="true"
                className="num grid h-7 w-7 place-items-center rounded-full bg-tint-100 text-[13px] font-semibold text-accent-ink"
              >
                {index + 1}
              </span>
              <h3 className="text-sm leading-5 font-semibold">{step.title}</h3>
              <p className="text-[13px] leading-5 text-muted">{step.body}</p>
            </li>
          ))}
        </ol>

        <p className="rounded-[var(--radius-control)] border border-border-soft bg-tint-50 px-4 py-3 text-[13px] leading-5 text-muted">
          Petugas dan pengelola masuk lewat{' '}
          <Link to="/login" className="font-medium text-accent-ink hover:underline">
            halaman login
          </Link>{' '}
          untuk membuka loket, papan antrean, dan dasbor.
        </p>
      </section>

      <section aria-labelledby="petugas" className="grid gap-4 border-t border-border-soft pt-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="grid gap-1">
            <h2 id="petugas" className="text-xl font-semibold tracking-[-0.01em]">
              Untuk petugas dan pengelola
            </h2>
            <p className="text-sm text-muted">Tiga alat kerja yang dipakai di loket dan kantor mal.</p>
          </div>
          <Link to="/login" className="text-[13px] font-medium text-accent-ink hover:underline">
            Masuk ke akun petugas
          </Link>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {DESKS.map((desk) => (
            <div
              key={desk.title}
              className="grid content-start gap-1.5 rounded-[var(--radius-card)] border border-border-soft bg-surface p-5"
            >
              <h3 className="text-sm font-semibold">{desk.title}</h3>
              <p className="text-[13px] leading-5 text-muted">{desk.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[var(--radius-card)] border border-border-soft bg-tint-50 px-5 py-4">
        <p className="text-[13px] leading-5 text-muted">
          <strong className="font-semibold text-ink">Prototipe Bandung Build Challenge 2026.</strong> Semua
          event, nama, jam, dan angka di halaman ini adalah data contoh.
        </p>
      </section>
    </div>
  )
}
