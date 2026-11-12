import { Input } from '@/components/ui/field'

type SearchInputProps = {
  value: string
  onChange: (value: string) => void
  placeholder: string
  label: string
}

export function SearchInput({ value, onChange, placeholder, label }: SearchInputProps) {
  return (
    <div className="relative w-full sm:max-w-xs">
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 stroke-muted"
      >
        <circle cx="7" cy="7" r="4.5" fill="none" strokeWidth="1.5" />
        <path d="m10.5 10.5 3 3" fill="none" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <Input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className="pl-9"
      />
    </div>
  )
}
