import { cn } from '@/components/ui/cn'
import { EDITOR_TABS, type EditorTab } from './editor-labels'

type EditorTabsProps = {
  active: EditorTab
  disabled: boolean
  onSelect: (tab: EditorTab) => void
}

// Tab digeser ke samping di ponsel. Saat event belum tersimpan, hanya Info yang aktif
// karena kategori, gambar, dan denah butuh id event.
export function EditorTabs({ active, disabled, onSelect }: EditorTabsProps) {
  return (
    <div className="-mx-1 overflow-x-auto px-1">
      <div role="tablist" aria-label="Bagian editor event" className="flex min-w-max gap-1 border-b border-border-soft">
        {EDITOR_TABS.map((tab) => {
          const selected = tab.value === active
          const locked = disabled && tab.value !== 'info'
          return (
            <button
              key={tab.value}
              type="button"
              role="tab"
              id={`editor-tab-${tab.value}`}
              aria-selected={selected}
              aria-controls="editor-panel"
              disabled={locked}
              onClick={() => onSelect(tab.value)}
              className={cn(
                '-mb-px h-10 border-b-2 px-3 text-sm font-semibold whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:text-faint',
                selected ? 'border-accent text-accent-ink' : 'border-transparent text-muted hover:text-ink',
              )}
            >
              {tab.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
