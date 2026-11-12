import type { ChangeEvent, InputHTMLAttributes } from 'react'
import { Field, Input } from '@/components/ui/field'
import type { InfoKey } from './info-values'

export type FieldBind = {
  id: InfoKey
  value: string
  error?: string
  onChange: (event: ChangeEvent<HTMLInputElement>) => void
}

type InfoFieldProps = FieldBind & {
  label: string
  hint?: string
  className?: string
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'value' | 'onChange'>

export function InfoField({ id, value, error, onChange, label, hint, className, ...input }: InfoFieldProps) {
  return (
    <Field label={label} hint={hint} error={Boolean(error)} className={className}>
      <Input id={id} value={value} onChange={onChange} error={Boolean(error)} {...input} />
    </Field>
  )
}
