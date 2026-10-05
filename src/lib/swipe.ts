import type { PointerEvent as ReactPointerEvent } from 'react'

export const SWIPE_BUTTON_WIDTH = 56

let swipeStartX = 0
let swipeStartY = 0
let swipeOffset = 0
let swipeActive = false
let swipeIsHorizontal = false
let swipeJustHappened = false

export function isSwipeJustHappened() {
  return swipeJustHappened
}

export function handleSwipeStart(event: ReactPointerEvent<HTMLElement>) {
  swipeStartX = event.clientX
  swipeStartY = event.clientY
  swipeOffset = 0
  swipeActive = true
  swipeIsHorizontal = false
}

export function handleSwipeMove(
  event: ReactPointerEvent<HTMLElement>,
  width: number,
  isSwiped: boolean
) {
  if (!swipeActive) return

  const dx = event.clientX - swipeStartX
  const dy = event.clientY - swipeStartY

  if (!swipeIsHorizontal) {
    if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return

    if (Math.abs(dy) > Math.abs(dx)) {
      swipeActive = false
      return
    }

    swipeIsHorizontal = true
  }

  const base = isSwiped ? -width : 0
  swipeOffset = Math.max(-width, Math.min(0, base + dx))

  const element = event.currentTarget
  element.style.transition = 'none'
  element.style.transform = `translateX(${swipeOffset}px)`
}

export function handleSwipeEnd(
  event: ReactPointerEvent<HTMLElement>,
  width: number,
  onResult: (isOpen: boolean) => void
) {
  if (!swipeActive) return

  swipeActive = false

  if (!swipeIsHorizontal) return

  swipeJustHappened = true
  window.setTimeout(() => {
    swipeJustHappened = false
  }, 50)

  const element = event.currentTarget
  element.style.transition = ''
  element.style.transform = ''

  onResult(swipeOffset < -width / 2)
}
