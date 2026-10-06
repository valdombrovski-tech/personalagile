import { useCallback, useEffect, useRef, useState } from 'react'

type LifeAreaOption = {
  key: string
  label: string
}

type LifeAreaFilterProps = {
  areas: ReadonlyArray<LifeAreaOption>
  value: string | null
  onChange: (key: string | null) => void
}

const FADE_SIZE = 20

export function LifeAreaFilter({
  areas,
  value,
  onChange,
}: LifeAreaFilterProps) {
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const [fadeLeft, setFadeLeft] = useState(false)
  const [fadeRight, setFadeRight] = useState(false)

    const dragRef = useRef({
    active: false,
    moved: false,
    startX: 0,
    startScroll: 0,
  })

  useEffect(() => {
    const scroller = scrollerRef.current

    if (!scroller) return

    function handleWheel(event: WheelEvent) {
      if (!scroller) return
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return
      if (scroller.scrollWidth <= scroller.clientWidth) return

      event.preventDefault()
      scroller.scrollLeft += event.deltaY
    }

    scroller.addEventListener('wheel', handleWheel, { passive: false })

    return () => scroller.removeEventListener('wheel', handleWheel)
  }, [])

  const updateFades = useCallback(() => {
    const scroller = scrollerRef.current

    if (!scroller) return

    setFadeLeft(scroller.scrollLeft > 2)
    setFadeRight(
      scroller.scrollLeft + scroller.clientWidth < scroller.scrollWidth - 2
    )
  }, [])

  useEffect(() => {
    updateFades()

    const frameId = window.requestAnimationFrame(updateFades)

    window.addEventListener('resize', updateFades)

    return () => {
      window.cancelAnimationFrame(frameId)
      window.removeEventListener('resize', updateFades)
    }
  }, [updateFades, areas.length])

  function revealChip(chip: HTMLButtonElement) {
    const scroller = scrollerRef.current

    if (!scroller) return

    const chipLeft = chip.offsetLeft
    const chipRight = chipLeft + chip.offsetWidth
    const visibleLeft = scroller.scrollLeft + FADE_SIZE
    const visibleRight = scroller.scrollLeft + scroller.clientWidth - FADE_SIZE

    if (chipLeft < visibleLeft) {
      scroller.scrollTo({ left: chipLeft - FADE_SIZE, behavior: 'smooth' })
    } else if (chipRight > visibleRight) {
      scroller.scrollTo({
        left: chipRight - scroller.clientWidth + FADE_SIZE,
        behavior: 'smooth',
      })
    }
  }

  function selectAll() {
    onChange(null)
    scrollerRef.current?.scrollTo({ left: 0, behavior: 'smooth' })
  }

  const fadeClass =
    fadeLeft && fadeRight
      ? 'is-faded-both'
      : fadeLeft
        ? 'is-faded-left'
        : fadeRight
          ? 'is-faded-right'
          : ''

  return (
    <div
      className="area-filter"
      role="group"
      aria-label="Фильтр по сфере жизни"
    >
      <button
        className={
          value === null
            ? 'area-filter-chip is-active'
            : 'area-filter-chip'
        }
        type="button"
        aria-pressed={value === null}
        onClick={selectAll}
      >
        Все
      </button>

      <div
        className={`area-filter-scroller ${fadeClass}`}
        ref={scrollerRef}
        onScroll={updateFades}
onPointerDown={(event) => {
          const scroller = scrollerRef.current

          if (event.pointerType !== 'mouse' || !scroller) return

          dragRef.current = {
            active: true,
            moved: false,
            startX: event.clientX,
            startScroll: scroller.scrollLeft,
          }
        }}
        onPointerMove={(event) => {
          const drag = dragRef.current
          const scroller = scrollerRef.current

          if (!drag.active || !scroller) return

          const delta = event.clientX - drag.startX

          if (Math.abs(delta) > 5) drag.moved = true

          if (drag.moved) scroller.scrollLeft = drag.startScroll - delta
        }}
        onPointerUp={() => {
          dragRef.current.active = false
        }}
        onPointerLeave={() => {
          dragRef.current.active = false
        }}
        onClickCapture={(event) => {
          if (dragRef.current.moved) {
            event.preventDefault()
            event.stopPropagation()
            dragRef.current.moved = false
          }
        }}
      >
        {areas.map((area) => (
          <button
            key={area.key}
            className={
              value === area.key
                ? 'area-filter-chip is-active'
                : 'area-filter-chip'
            }
            type="button"
            aria-pressed={value === area.key}
            onClick={(event) => {
              onChange(area.key)
              revealChip(event.currentTarget)
            }}
          >
            {area.label}
          </button>
        ))}
      </div>
    </div>
  )
}