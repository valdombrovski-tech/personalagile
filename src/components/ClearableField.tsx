import type { ReactNode } from 'react'
import { X } from 'lucide-react'

type ClearableFieldProps = {
  hasValue: boolean
  onClear: () => void
  label?: string
  children: ReactNode
}

export function ClearableField({
  hasValue,
  onClear,
  label = 'Очистить',
  children,
}: ClearableFieldProps) {
  return (
    <div className="clearable-field">
      {children}

      {hasValue ? (
        <button
          className="clear-button"
          type="button"
          aria-label={label}
          title={label}
          onMouseDown={(event) => event.preventDefault()}
          onClick={onClear}
        >
          <X size={12} strokeWidth={2.5} />
        </button>
      ) : null}
    </div>
  )
}