import type { KeyboardEvent, MouseEvent } from 'react'

export const pickerProps = {
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => {
    if (!['Tab', 'Backspace', 'Delete'].includes(event.key)) {
      event.preventDefault()
    }
  },
  onClick: (event: MouseEvent<HTMLInputElement>) => {
    try {
      event.currentTarget.showPicker()
    } catch {
      // на iPhone выбор открывается сам при нажатии
    }
  },
}
