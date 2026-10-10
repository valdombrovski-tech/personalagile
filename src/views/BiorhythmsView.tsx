import { useState } from 'react'
import { Activity } from 'lucide-react'


const DAY_MS = 86400000
const RING_RADIUS = 38
const RING_LENGTH = 2 * Math.PI * RING_RADIUS


const CYCLES = [
  {
    key: 'physical',
    title: 'Физический',
    period: 23,
    color: '#e5484d',
    description:
      'Это ваше физическое состояние: энергия, выносливость, сила и координация.',
    high: 'много сил, хорошо идут тренировки и физически тяжёлые дела.',
    low: 'организм быстрее устаёт, лучше выбрать лёгкую нагрузку и больше отдыхать.',
  },
  {
    key: 'emotional',
    title: 'Эмоциональный',
    period: 28,
    color: '#3e63dd',
    description:
      'Это ваше эмоциональное состояние: настроение, чувствительность и отношение к людям.',
    high: 'легче общаться, больше позитива и творческого подъёма.',
    low: 'эмоции острее, возможны раздражительность и усталость, поберегите себя.',
  },
  {
    key: 'intellectual',
    title: 'Интеллектуальный',
    period: 33,
    color: '#30a46c',
    description:
      'Это ваше интеллектуальное состояние: память, внимание и логика.',
    high: 'хорошо учиться, анализировать и принимать взвешенные решения.',
    low: 'сложнее сосредоточиться, важные решения лучше отложить.',
  },
  {
    key: 'intuitive',
    title: 'Интуитивный',
    period: 38,
    color: '#8e4ec6',
    description:
      'Это ваша интуиция: чутьё, вдохновение и внутренние подсказки.',
    high: 'прислушивайтесь к внутреннему голосу, хорошо идут новые идеи.',
    low: 'интуиция тише, опирайтесь на факты и проверенные данные.',
  },
]


function toDayNumber(year: number, month: number, day: number) {
  return Math.floor(Date.UTC(year, month, day) / DAY_MS)
}


function parseDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return toDayNumber(year, month - 1, day)
}


function getTodayNumber() {
  const now = new Date()
  return toDayNumber(now.getFullYear(), now.getMonth(), now.getDate())
}


type Cycle = (typeof CYCLES)[number]


function CycleGauge({
  cycle,
  days,
  isFlipped,
  onToggle,
}: {
  cycle: Cycle
  days: number
  isFlipped: boolean
  onToggle: () => void
}) {
  const angle = (2 * Math.PI * days) / cycle.period
  const value = Math.sin(angle)
  const slope = Math.cos(angle)
  const fill = (value + 1) / 2
  const percent = Math.round(fill * 100)
  const isRising = slope >= 0
  const isHigh = percent >= 50


  return (
    <article className="biorhythm-tile">
      <button
        type="button"
        className={`biorhythm-flip${isFlipped ? ' is-flipped' : ''}`}
        aria-pressed={isFlipped}
                onClick={onToggle}
      >
        <span className="biorhythm-inner">
          <span className="biorhythm-face biorhythm-front">
            <svg
              viewBox="0 0 100 100"
              role="img"
              aria-label={`${cycle.title}: ${percent}%, ${
                isRising ? 'подъём' : 'спад'
              }`}
            >
              <circle
                cx="50"
                cy="50"
                r={RING_RADIUS}
                fill="none"
                stroke="#eceef2"
                strokeWidth="9"
              />
              <circle
                cx="50"
                cy="50"
                r={RING_RADIUS}
                fill="none"
                stroke={cycle.color}
                strokeWidth="9"
                strokeLinecap="round"
                strokeDasharray={`${RING_LENGTH * fill} ${RING_LENGTH}`}
                transform="rotate(-90 50 50)"
              />
              <text
                x="50"
                y="53"
                textAnchor="middle"
                fontSize="19"
                fontWeight="700"
                fill="#1f2430"
              >
                {percent}%
              </text>
              <polyline
                points={
                  isRising ? '43,70 50,63 57,70' : '43,63 50,70 57,63'
                }
                fill="none"
                stroke={isRising ? '#30a46c' : '#e5484d'}
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>


            <span className="biorhythm-title">{cycle.title}</span>
          </span>


          <span className="biorhythm-face biorhythm-back">
            <span className="biorhythm-title">{cycle.title}</span>
            <span className="biorhythm-text">{cycle.description}</span>
            <span
              className={`biorhythm-text biorhythm-level${
                isHigh ? ' is-current' : ''
              }`}
            >
              Выше 50%: {cycle.high}
            </span>
            <span
              className={`biorhythm-text biorhythm-level${
                isHigh ? '' : ' is-current'
              }`}
            >
              Ниже 50%: {cycle.low}
            </span>
          </span>
        </span>
      </button>
    </article>
  )
}


type BiorhythmsViewProps = {
  birthDate: string
}


export function BiorhythmsView({ birthDate }: BiorhythmsViewProps) {
   const [flippedKey, setFlippedKey] = useState<string | null>(null)


    if (!birthDate) {
    return (
      <section className="biorhythms-view">
        <Activity size={36} aria-hidden="true" />
        <h2>Нужна дата рождения</h2>
        <p>
          Укажи её в разделе «Мой аккаунт» (меню под кружком справа вверху), и
          биоритмы появятся здесь автоматически.
        </p>
      </section>
    )
  }


  const days = getTodayNumber() - parseDate(birthDate)


  return (
    <section className="biorhythms-page">
      <div className="biorhythm-grid">
               {CYCLES.map((cycle) => (
          <CycleGauge
            key={cycle.key}
            cycle={cycle}
            days={days}
            isFlipped={flippedKey === cycle.key}
            onToggle={() =>
              setFlippedKey((current) =>
                current === cycle.key ? null : cycle.key
              )
            }
          />
        ))}
      </div>


      <p className="biorhythms-note">
        Теория научно не подтверждена и носит развлекательный характер
      </p>
    </section>
  )
}