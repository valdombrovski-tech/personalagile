import { Circle } from 'lucide-react'
import { LIFE_AREAS, LIFE_AREA_COLORS } from '../lib/lifeAreas'
import type { LifeArea } from '../lib/types'

export function LifeAreaIcon({ area }: { area: LifeArea | null }) {
  const found = LIFE_AREAS.find((item) => item.key === area)
  const Icon = found ? found.Icon : Circle
  return <Icon size={18} aria-label={found?.label ?? 'Без сферы'} />
}

export function LifeAreaBadge({ area }: { area: LifeArea }) {
  const found = LIFE_AREAS.find((item) => item.key === area)

  if (!found) {
    return null
  }

  const colors = LIFE_AREA_COLORS[area]

  return (
    <span
      className="life-area-badge"
      style={{ background: colors.bg, color: colors.text }}
    >
      {found.label}
    </span>
  )
}

export function LifeAreaPicker({
  value,
  onChange,
}: {
  value: LifeArea | null
  onChange: (value: LifeArea | null) => void
}) {
  const selected = LIFE_AREAS.find((item) => item.key === value)

  return (
    <div className="life-area-picker">
      <div className="life-area-row" role="group" aria-label="Сфера жизни">
        {LIFE_AREAS.map(({ key, label, Icon }) => {
          const isActive = value === key

          return (
            <button
              key={key}
              type="button"
              className={`life-area-option ${isActive ? 'is-active' : ''}`}
              title={label}
              aria-label={label}
              aria-pressed={isActive}
              onClick={() => onChange(isActive ? null : key)}
            >
              <Icon size={24} />
            </button>
          )
        })}
      </div>

      <p className="life-area-name">
        {selected ? selected.label : 'Сфера жизни'}
      </p>
    </div>
  )
}