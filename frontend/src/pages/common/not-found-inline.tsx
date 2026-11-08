import type { ReactNode } from 'react'
import { Empty } from '@/components/ui/pill'

// 404 di dalam konteks, misalnya event yang dimaksud sudah tidak ada.
export function NotFoundInline({
  title,
  message,
  action,
}: {
  title: string
  message: string
  action?: ReactNode
}) {
  return <Empty title={title} hint={message} action={action} />
}
