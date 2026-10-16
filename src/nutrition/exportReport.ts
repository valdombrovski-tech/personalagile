import { supabase } from '../supabaseClient'
import { MEALS, type PlanItem } from './types'
import { formatNutrient, sumTotals } from './nutrition'

const ITEM_SELECT =
  'id, user_id, plan_date, meal, grams, position, updated_by, updated_at, deleted_at, deleted_by, food:foods(*)'

export type ReportRange = 'day' | 'week'

type DayData = { date: string; items: PlanItem[] }

export type ReadyReport = {
  file: File
  text: string
  title: string
}

function parseDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function toDateString(date: Date) {
  return [
    String(date.getFullYear()),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

export function shiftDateString(value: string, days: number) {
  const date = parseDate(value)
  date.setDate(date.getDate() + days)
  return toDateString(date)
}

function listDates(start: string, end: string) {
  const dates: string[] = []
  let current = start

  while (current <= end) {
    dates.push(current)
    current = shiftDateString(current, 1)
  }

  return dates
}

function longDate(value: string) {
  return parseDate(value).toLocaleDateString('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

function shortDate(value: string) {
  return parseDate(value).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
  })
}

function weekdayDate(value: string) {
  return parseDate(value).toLocaleDateString('ru-RU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function macros(totals: { protein: number; fat: number; carbs: number }) {
  return `Б ${formatNutrient(totals.protein)} · Ж ${formatNutrient(
    totals.fat
  )} · У ${formatNutrient(totals.carbs)}`
}

async function fetchReportItems(
  start: string,
  end: string,
  ownerId: string
) {
  const { data, error } = await supabase
    .from('plan_items')
    .select(ITEM_SELECT)
    .eq('user_id', ownerId)
    .is('deleted_at', null)
    .gte('plan_date', start)
    .lte('plan_date', end)
    .order('position')
    .order('created_at')

  if (error) throw error

  return (data ?? []) as unknown as PlanItem[]
}

function buildText(days: DayData[]) {
  const lines: string[] = []

  if (days.length > 1) {
    lines.push(
      `Дневник питания: ${shortDate(days[0].date)} – ${shortDate(
        days[days.length - 1].date
      )}`,
      ''
    )
  }

  days.forEach((day) => {
    const heading = capitalize(longDate(day.date))

    if (day.items.length === 0) {
      lines.push(`${heading}: записей нет`, '')
      return
    }

    const totals = sumTotals(day.items)

    lines.push(
      heading,
      `Итого: ${Math.round(totals.kcal)} ккал · ${macros(totals)}`
    )

    MEALS.forEach((meal) => {
      const mealItems = day.items.filter((item) => item.meal === meal.value)

      if (mealItems.length === 0) return

      const mealTotals = sumTotals(mealItems)

      lines.push(
        '',
        `${meal.label} — ${Math.round(mealTotals.kcal)} ккал (${macros(
          mealTotals
        )})`
      )

      mealItems.forEach((item) => {
        lines.push(
          `• ${item.food.name}, ${formatNutrient(item.grams)} г — ${Math.round(
            sumTotals([item]).kcal
          )} ккал`
        )
      })
    })

    lines.push('')
  })

  return lines.join('\n').trim()
}

const right = (text: string, extra: object = {}) => ({
  text,
  alignment: 'right',
  ...extra,
})

function buildDocDefinition(days: DayData[], title: string) {
  const content: unknown[] = [{ text: title, style: 'title' }]
  const filledDays = days.filter((day) => day.items.length > 0)

  if (days.length > 1) {
    const rows = days.map((day) => {
      if (day.items.length === 0) {
        return [weekdayDate(day.date), right('—'), right('—'), right('—'), right('—')]
      }

      const totals = sumTotals(day.items)

      return [
        weekdayDate(day.date),
        right(String(Math.round(totals.kcal))),
        right(formatNutrient(totals.protein)),
        right(formatNutrient(totals.fat)),
        right(formatNutrient(totals.carbs)),
      ]
    })

    if (filledDays.length > 0) {
      const sum = sumTotals(filledDays.flatMap((day) => day.items))
      const count = filledDays.length

      rows.push([
        { text: `Среднее за день (дней с записями: ${count})`, bold: true },
        right(String(Math.round(sum.kcal / count)), { bold: true }),
        right(formatNutrient(sum.protein / count), { bold: true }),
        right(formatNutrient(sum.fat / count), { bold: true }),
        right(formatNutrient(sum.carbs / count), { bold: true }),
      ] as never)
    }

    content.push({
      table: {
        headerRows: 1,
        widths: ['*', 50, 40, 40, 40],
        body: [
          [
            { text: 'День', style: 'th' },
            right('Ккал', { style: 'th' }),
            right('Б, г', { style: 'th' }),
            right('Ж, г', { style: 'th' }),
            right('У, г', { style: 'th' }),
          ],
          ...rows,
        ],
      },
      layout: 'lightHorizontalLines',
      margin: [0, 0, 0, 6],
    })
  }

  const detailDays = days.length > 1 ? filledDays : days

  detailDays.forEach((day) => {
    content.push({ text: capitalize(longDate(day.date)), style: 'dayTitle' })

    if (day.items.length === 0) {
      content.push({ text: 'Записей нет', style: 'muted' })
      return
    }

    const totals = sumTotals(day.items)

    content.push({
      text: `Итого: ${Math.round(totals.kcal)} ккал · ${macros(totals)}`,
      bold: true,
    })

    MEALS.forEach((meal) => {
      const mealItems = day.items.filter((item) => item.meal === meal.value)

      if (mealItems.length === 0) return

      const mealTotals = sumTotals(mealItems)

      const body = [
        [
          { text: 'Продукт', style: 'th' },
          right('Вес, г', { style: 'th' }),
          right('Ккал', { style: 'th' }),
          right('Б', { style: 'th' }),
          right('Ж', { style: 'th' }),
          right('У', { style: 'th' }),
        ],
        ...mealItems.map((item) => {
          const itemTotals = sumTotals([item])

          return [
            item.food.name,
            right(formatNutrient(item.grams)),
            right(String(Math.round(itemTotals.kcal))),
            right(formatNutrient(itemTotals.protein)),
            right(formatNutrient(itemTotals.fat)),
            right(formatNutrient(itemTotals.carbs)),
          ]
        }),
        [
          { text: 'Итого', bold: true },
          '',
          right(String(Math.round(mealTotals.kcal)), { bold: true }),
          right(formatNutrient(mealTotals.protein), { bold: true }),
          right(formatNutrient(mealTotals.fat), { bold: true }),
          right(formatNutrient(mealTotals.carbs), { bold: true }),
        ],
      ]

      content.push(
        { text: meal.label, style: 'mealTitle', keepWithNext: true },
        {
          table: {
            headerRows: 1,
            widths: ['*', 46, 40, 32, 32, 32],
            body,
          },
          layout: 'lightHorizontalLines',
        }
      )
    })
  })

  return {
    info: { title },
    pageSize: 'A4',
    pageMargins: [36, 40, 36, 40],
    defaultStyle: { fontSize: 10 },
    styles: {
      title: { fontSize: 16, bold: true, margin: [0, 0, 0, 10] },
      dayTitle: { fontSize: 13, bold: true, margin: [0, 14, 0, 2] },
      mealTitle: { fontSize: 11, bold: true, margin: [0, 8, 0, 3] },
      th: { bold: true, fillColor: '#f0f0f0' },
      muted: { color: '#666666' },
    },
    content,
  }
}

async function buildPdfBlob(days: DayData[], title: string) {
  const [pdfMakeModule, fontsModule] = await Promise.all([
    import('pdfmake/build/pdfmake'),
    import('pdfmake/build/vfs_fonts'),
  ])

  const pdfMake =
    (pdfMakeModule as { default?: typeof pdfMakeModule.default }).default ??
    (pdfMakeModule as unknown as typeof pdfMakeModule.default)

  const fonts =
    (fontsModule as { default?: unknown }).default ?? fontsModule

  pdfMake.addVirtualFileSystem(fonts)

  return pdfMake.createPdf(buildDocDefinition(days, title)).getBlob()
}

export async function createReport(
  endDate: string,
  range: ReportRange,
  ownerId?: string
): Promise<ReadyReport> {
  let reportOwnerId = ownerId

  if (!reportOwnerId) {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) throw authError

    if (!user) {
      throw new Error('Необходимо войти в аккаунт')
    }

    reportOwnerId = user.id
  }

  const start =
    range === 'week'
      ? shiftDateString(endDate, -6)
      : endDate

  const dates = listDates(start, endDate)

  const items = await fetchReportItems(
    start,
    endDate,
    reportOwnerId
  )

  const days: DayData[] = dates.map((date) => ({
    date,
    items: items.filter((item) => item.plan_date === date),
  }))

  const title =
    range === 'week'
      ? `Дневник питания · ${shortDate(start)} – ${shortDate(endDate)}`
      : `Дневник питания · ${capitalize(longDate(endDate))}`

  const blob = await buildPdfBlob(days, title)

  const fileName =
    range === 'week'
      ? `nutrition-${start}_${endDate}.pdf`
      : `nutrition-${endDate}.pdf`

  return {
    file: new File([blob], fileName, { type: 'application/pdf' }),
    text: buildText(days),
    title,
  }
}

export function downloadFile(file: File) {
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')

  link.href = url
  link.download = file.name
  document.body.appendChild(link)
  link.click()
  link.remove()

  window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export async function shareFile(
  file: File,
  title: string
): Promise<'shared' | 'cancelled' | 'unsupported'> {
  if (
    typeof navigator.share !== 'function' ||
    typeof navigator.canShare !== 'function' ||
    !navigator.canShare({ files: [file] })
  ) {
    return 'unsupported'
  }

  try {
    await navigator.share({ files: [file], title })
    return 'shared'
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return 'cancelled'
    }

    throw error
  }
}