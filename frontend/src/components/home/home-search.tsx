import { useState, type FormEvent } from 'react'
import { createSearchParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/field'

// Cari di beranda tidak menyaring di tempat: hasilnya dibuka di halaman Event
// supaya filter tanggal dan urutan langsung tersedia di sana.
export function HomeSearch() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = query.trim()
    navigate(trimmed ? { pathname: '/events', search: createSearchParams({ q: trimmed }).toString() } : '/events')
  }

  return (
    <form role="search" onSubmit={submit} className="flex w-full max-w-[560px] gap-2">
      <label htmlFor="home-search" className="sr-only">
        Cari event
      </label>
      <Input
        id="home-search"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Cari nama event atau tempat"
        autoComplete="off"
        enterKeyHint="search"
        className="min-w-0 flex-1"
      />
      <Button type="submit" className="h-11! flex-none sm:h-10!">
        Cari
      </Button>
    </form>
  )
}
