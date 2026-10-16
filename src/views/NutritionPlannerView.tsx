import { useEffect, useRef, useState } from 'react'
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Share2,
  X,
} from 'lucide-react'
import { getTodayString } from '../lib/dates'
import { usePlanItems } from '../nutrition/usePlanItems'
import { useCurrentUserId } from '../nutrition/useCurrentUserId'
import { usePlanAuthorNames } from '../nutrition/usePlanAuthorNames'
import { MEALS, type MealType, type PlanItem } from '../nutrition/types'
import { useFoods } from '../nutrition/useFoods'
import { AddFoodSheet } from '../components/AddFoodSheet'
import { ExportSheet } from '../components/ExportSheet'
import { formatNutrient, sumTotals } from '../nutrition/nutrition'

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

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

function shiftDate(value: string, days: number) {
  const date = parseDate(value)
  date.setDate(date.getDate() + days)
  return toDateString(date)
}

function getMonday(value: string) {
  const offset = (parseDate(value).getDay() + 6) % 7
  return shiftDate(value, -offset)
}

function formatShort(value: string) {
  return parseDate(value).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
  })
}

function parseGrams(value: string) {
  const normalized = value.trim().replace(',', '.')
  return normalized === '' ? NaN : Number(normalized)
}

function UpdatedByBadge({
  username,
}: {
  username?: string
}) {
  if (!username) return null

  return (
    <span
      title={`Последнее изменение: @${username}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        alignSelf: 'flex-start',
        width: 'fit-content',
        maxWidth: '100%',
        marginTop: 4,
        padding: '2px 7px',
        borderRadius: 999,
        backgroundColor: '#dcfce7',
        color: '#166534',
        fontSize: 10,
        fontWeight: 500,
        lineHeight: '16px',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        verticalAlign: 'middle',
      }}
    >
      upd by: @{username}
    </span>
  )
}

type PlanItemRowProps = {
  item: PlanItem
  canEdit: boolean
  updatedByUsername?: string
  onUpdateGrams: (itemId: string, grams: number) => Promise<boolean>
  onRemove: (itemId: string) => Promise<boolean>
  onRestore: (itemId: string) => Promise<boolean>
  onDeletePermanently: (itemId: string) => Promise<boolean>
}

function PlanItemRow({
  item,
  canEdit,
  updatedByUsername,
  onUpdateGrams,
  onRemove,
  onRestore,
  onDeletePermanently,
}: PlanItemRowProps) {
  const savedGrams = Number(item.grams)
  const isDeleted = Boolean(item.deleted_at)
  const canChange = canEdit && !isDeleted

  const [draft, setDraft] = useState(String(savedGrams))
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)

  const skipCommit = useRef(false)

  useEffect(() => {
    if (!isEditing || isDeleted) {
      setDraft(String(savedGrams))
    }
  }, [savedGrams, isEditing, isDeleted])

  const draftGrams = parseGrams(draft)

  const isDraftValid =
    Number.isFinite(draftGrams) &&
    draftGrams > 0 &&
    draftGrams <= 5000

  const previewTotals = sumTotals([
    isDraftValid ? { ...item, grams: draftGrams } : item,
  ])

  async function commit() {
    setIsEditing(false)

    if (skipCommit.current) {
      skipCommit.current = false
      setDraft(String(savedGrams))
      return
    }

    if (
      !canChange ||
      !isDraftValid ||
      draftGrams === savedGrams ||
      isSaving ||
      isRemoving
    ) {
      setDraft(String(savedGrams))
      return
    }

    setIsSaving(true)

    try {
      const isSaved = await onUpdateGrams(
        item.id,
        draftGrams
      )

      if (!isSaved) {
        setDraft(String(savedGrams))
      }
    } finally {
      setIsSaving(false)
    }
  }

  async function remove() {
    if (!canChange || isSaving || isRemoving) return

    setIsRemoving(true)

    try {
      await onRemove(item.id)
    } finally {
      setIsRemoving(false)
    }
  }

  async function handleDeletedAction(
    action: 'restore' | 'delete'
  ) {
    if (
      !canEdit ||
      !isDeleted ||
      isSaving ||
      isRemoving
    ) {
      return
    }

    if (
      action === 'delete' &&
      !window.confirm(
        `Удалить «${item.food.name}» из плана совсем?\n\nВернуть эту позицию после удаления будет нельзя.`
      )
    ) {
      return
    }

    setIsRemoving(true)

    try {
      if (action === 'restore') {
        await onRestore(item.id)
      } else {
        await onDeletePermanently(item.id)
      }
    } finally {
      setIsRemoving(false)
    }
  }

  return (
    <li
      className={[
        'nutrition-item',
        isDeleted ? 'is-deleted' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={
        isDeleted
          ? { backgroundColor: '#f8faf9' }
          : undefined
      }
    >
      <div className="nutrition-item-details">
        <span
          className="nutrition-item-name"
          style={
            isDeleted
              ? {
                  opacity: 0.45,
                  textDecoration: 'line-through',
                }
              : undefined
          }
        >
          {item.food.name}
        </span>

        {isDeleted ? (
          <span
            className="nutrition-item-macros"
            style={{ color: '#6b7280' }}
          >
            Удалено · не учитывается в итогах
          </span>
        ) : (
          <span className="nutrition-item-macros">
            Б {formatNutrient(previewTotals.protein)} г
            {' · '}
            Ж {formatNutrient(previewTotals.fat)} г
            {' · '}
            У {formatNutrient(previewTotals.carbs)} г
          </span>
        )}

        <UpdatedByBadge username={updatedByUsername} />

        {isDeleted && canEdit && (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
              marginTop: 8,
            }}
          >
            <button
              type="button"
              disabled={isSaving || isRemoving}
              onClick={() => {
                void handleDeletedAction('restore')
              }}
              style={{
                padding: '4px 9px',
                border: '1px solid #bbf7d0',
                borderRadius: 8,
                backgroundColor: '#f0fdf4',
                color: '#166534',
                fontSize: 12,
                cursor: isRemoving ? 'wait' : 'pointer',
              }}
            >
              Вернуть
            </button>

            <button
              type="button"
              disabled={isSaving || isRemoving}
              onClick={() => {
                void handleDeletedAction('delete')
              }}
              style={{
                padding: '4px 9px',
                border: '1px solid #fecaca',
                borderRadius: 8,
                backgroundColor: '#fff7f7',
                color: '#b91c1c',
                fontSize: 12,
                cursor: isRemoving ? 'wait' : 'pointer',
              }}
            >
              Удалить совсем
            </button>
          </div>
        )}

      </div>

      <label
        className="nutrition-item-grams nutrition-item-grams-edit"
        style={isDeleted ? { opacity: 0.45 } : undefined}
      >
        {canChange && (
          <Pencil size={12} aria-hidden="true" />
        )}

        <input
          type="text"
          inputMode="decimal"
          aria-label={`Вес: ${item.food.name}`}
          value={draft}
          disabled={!canChange || isSaving || isRemoving}
          onFocus={(event) => {
            setIsEditing(true)
            event.currentTarget.select()
          }}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => void commit()}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.currentTarget.blur()
            }

            if (event.key === 'Escape') {
              skipCommit.current = true
              setDraft(String(savedGrams))
              event.currentTarget.blur()
            }
          }}
        />

        <span aria-hidden="true">г</span>
      </label>

      <span
        className="nutrition-item-kcal"
        style={isDeleted ? { opacity: 0.45 } : undefined}
      >
        {isDeleted
          ? '—'
          : `${Math.round(previewTotals.kcal)} ккал`}
      </span>

      {canChange && (
        <button
          className="nutrition-item-remove"
          type="button"
          aria-label={`Удалить: ${item.food.name}`}
          disabled={isSaving || isRemoving}
          onClick={() => void remove()}
        >
          <X size={16} aria-hidden="true" />
        </button>
      )}
    </li>
  )
}

type NutritionPlannerViewProps = {
  targetOwnerId?: string
  canEdit?: boolean
}

export function NutritionPlannerView({
  targetOwnerId,
  canEdit = true,
}: NutritionPlannerViewProps) {
  const today = getTodayString()

  const [weekStart, setWeekStart] = useState(() => getMonday(today))
  const [selectedDate, setSelectedDate] = useState(today)

  const currentUserId = useCurrentUserId()
  const ownerId = targetOwnerId ?? currentUserId ?? null

  const weekDates = Array.from({ length: 7 }, (_, index) =>
    shiftDate(weekStart, index)
  )

  const weekEnd = weekDates[6]

  const {
    items,
    isLoading,
    error,
    addItem,
    updateGrams,
    removeItem,
    restoreItem,
    deleteItemPermanently,
    refresh,
  } = usePlanItems(ownerId, weekStart, weekEnd)

  const authorNames = usePlanAuthorNames(
    ownerId,
    currentUserId ?? null,
    items
  )

  const { foods, error: foodsError, addFood } = useFoods()

  const [addingMeal, setAddingMeal] = useState<MealType | null>(null)
  const [openMeals, setOpenMeals] = useState<MealType[]>([])
  const [isExporting, setIsExporting] = useState(false)

  const canEditPlan = canEdit && Boolean(ownerId)

  const pageRef = useRef<HTMLElement | null>(null)

  function getForeignAuthorUsername(item: PlanItem) {
    const authorId = item.deleted_at
      ? item.deleted_by ?? item.updated_by
      : item.updated_by

    if (
      !currentUserId ||
      !authorId ||
      authorId === currentUserId
    ) {
      return undefined
    }

    return authorNames[authorId]
  }

  useEffect(() => {
    const page = pageRef.current
    if (!page) return

    let startX = 0
    let startY = 0
    let pullDistance = 0
    let tracking = false

    function isAtTop() {
      let element: HTMLElement | null = page

      while (element) {
        if (element.scrollTop > 1) return false
        element = element.parentElement
      }

      return window.scrollY <= 1
    }

    function resetPull() {
      tracking = false
      pullDistance = 0
    }

    function handleTouchStart(event: TouchEvent) {
      resetPull()

      if (
        isLoading ||
        !ownerId ||
        addingMeal ||
        isExporting ||
        event.touches.length !== 1 ||
        !isAtTop()
      ) {
        return
      }

      const target = event.target

      if (
        target instanceof Element &&
        target.closest(
          'input, textarea, select, [contenteditable="true"]'
        )
      ) {
        return
      }

      startX = event.touches[0].clientX
      startY = event.touches[0].clientY
      tracking = true
    }

    function handleTouchMove(event: TouchEvent) {
      if (!tracking) return

      if (event.touches.length !== 1) {
        resetPull()
        return
      }

      const deltaX = event.touches[0].clientX - startX
      const deltaY = event.touches[0].clientY - startY

      if (
        deltaY <= 0 ||
        Math.abs(deltaX) > Math.abs(deltaY) ||
        !isAtTop()
      ) {
        resetPull()
        return
      }

      pullDistance = deltaY

      if (event.cancelable) {
        event.preventDefault()
      }
    }

    function handleTouchEnd() {
      const shouldRefresh = tracking && pullDistance >= 80

      resetPull()

      if (shouldRefresh) {
        refresh()
      }
    }

    page.addEventListener('touchstart', handleTouchStart, {
      passive: true,
    })

    page.addEventListener('touchmove', handleTouchMove, {
      passive: false,
    })

    page.addEventListener('touchend', handleTouchEnd)
    page.addEventListener('touchcancel', resetPull)

    return () => {
      page.removeEventListener('touchstart', handleTouchStart)
      page.removeEventListener('touchmove', handleTouchMove)
      page.removeEventListener('touchend', handleTouchEnd)
      page.removeEventListener('touchcancel', resetPull)
    }
  }, [
    isLoading,
    ownerId,
    addingMeal,
    isExporting,
    refresh,
  ])

  useEffect(() => {
    setAddingMeal(null)
    setIsExporting(false)
    setOpenMeals([])
  }, [ownerId])

  function toggleMeal(mealValue: MealType) {
    setOpenMeals((current) =>
      current.includes(mealValue)
        ? current.filter((value) => value !== mealValue)
        : [...current, mealValue]
    )
  }

  function openMeal(mealValue: MealType) {
    setOpenMeals((current) =>
      current.includes(mealValue)
        ? current
        : [...current, mealValue]
    )
  }

  const dayItems = items.filter(
    (item) => item.plan_date === selectedDate
  )

  const dayTotals = sumTotals(
    dayItems.filter((item) => !item.deleted_at)
  )

  function changeWeek(offset: number) {
    setWeekStart((current) => shiftDate(current, offset * 7))
    setSelectedDate((current) => shiftDate(current, offset * 7))
  }

  return (
    <section ref={pageRef} className="nutrition-page">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 12,
        }}
      >
        <span
          role="status"
          aria-live="polite"
          style={{ fontSize: 12, opacity: 0.7 }}
        >
          {isLoading
            ? 'Обновляем план…'
            : 'Обновите план, чтобы увидеть последние изменения'}
        </span>

        <button
          type="button"
          disabled={isLoading || !ownerId}
          onClick={refresh}
        >
          Обновить
        </button>
      </div>

      {(error || foodsError) && (
        <p className="habit-calendar-error" role="alert">
          {error || foodsError}
        </p>
      )}

      <div className="nutrition-week-nav">
        <button
          type="button"
          aria-label="Предыдущая неделя"
          onClick={() => changeWeek(-1)}
        >
          <ChevronLeft size={20} aria-hidden="true" />
        </button>

        <h3>
          {formatShort(weekStart)} – {formatShort(weekEnd)}
        </h3>

        <button
          type="button"
          aria-label="Следующая неделя"
          onClick={() => changeWeek(1)}
        >
          <ChevronRight size={20} aria-hidden="true" />
        </button>
      </div>

      <div className="nutrition-week-strip">
        {weekDates.map((date, index) => {
          const kcal = sumTotals(
            items.filter(
              (item) =>
                item.plan_date === date &&
                !item.deleted_at
            )
          ).kcal

          return (
            <button
              key={date}
              type="button"
              className={[
                'nutrition-day',
                date === selectedDate ? 'is-selected' : '',
                date === today ? 'is-today' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-pressed={date === selectedDate}
              onClick={() => setSelectedDate(date)}
            >
              <span className="nutrition-day-weekday">
                {WEEKDAYS[index]}
              </span>

              <span className="nutrition-day-number">
                {Number(date.slice(8, 10))}
              </span>

              <span className="nutrition-day-kcal">
                {kcal > 0 ? Math.round(kcal) : ''}
              </span>
            </button>
          )
        })}
      </div>

      {isLoading || !ownerId ? (
        <p>Загрузка плана…</p>
      ) : (
        <>
          <div
            className="nutrition-summary"
            role="group"
            aria-label="Итого за день"
          >
            <div className="nutrition-summary-item">
              <span className="nutrition-summary-value">
                {Math.round(dayTotals.kcal)}
              </span>
              <span className="nutrition-summary-label">
                ккал
              </span>
            </div>

            <div className="nutrition-summary-item">
              <span className="nutrition-summary-value">
                {formatNutrient(dayTotals.protein)}
              </span>
              <span className="nutrition-summary-label">
                белки, г
              </span>
            </div>

            <div className="nutrition-summary-item">
              <span className="nutrition-summary-value">
                {formatNutrient(dayTotals.fat)}
              </span>
              <span className="nutrition-summary-label">
                жиры, г
              </span>
            </div>

            <div className="nutrition-summary-item">
              <span className="nutrition-summary-value">
                {formatNutrient(dayTotals.carbs)}
              </span>
              <span className="nutrition-summary-label">
                углеводы, г
              </span>
            </div>
          </div>

          <button
            className="nutrition-export-button"
            type="button"
            onClick={() => setIsExporting(true)}
          >
            <Share2 size={16} aria-hidden="true" />
            Сводка для нутрициолога
          </button>

          {MEALS.map((meal) => {
            const mealItems = dayItems
              .filter((item) => item.meal === meal.value)
              .sort((a, b) => {
                const deletedDifference =
                  Number(Boolean(a.deleted_at)) -
                  Number(Boolean(b.deleted_at))

                if (deletedDifference !== 0) {
                  return deletedDifference
                }

                if (a.deleted_at && b.deleted_at) {
                  return (
                    Date.parse(a.deleted_at) -
                    Date.parse(b.deleted_at)
                  )
                }

                return a.position - b.position
              })

            const activeMealItems = mealItems.filter(
              (item) => !item.deleted_at
            )

            const mealTotals = sumTotals(activeMealItems)
            const isOpen = openMeals.includes(meal.value)
            const panelId = `nutrition-meal-${meal.value}`

            const latestChangedItem = mealItems.reduce<
              PlanItem | undefined
            >((latest, item) => {
              if (!item.updated_by && !item.deleted_by) {
                return latest
              }

              if (!latest) return item

              return Date.parse(item.updated_at) >
                Date.parse(latest.updated_at)
                ? item
                : latest
            }, undefined)

            const mealUpdatedByUsername = latestChangedItem
              ? getForeignAuthorUsername(latestChangedItem)
              : undefined

            return (
              <div
                className={`nutrition-meal${isOpen ? ' is-open' : ''}`}
                key={meal.value}
              >
                <div className="nutrition-meal-header">
                  <button
                    className="nutrition-meal-toggle"
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => toggleMeal(meal.value)}
                  >
                    <ChevronDown
                      className="nutrition-meal-chevron"
                      size={18}
                      aria-hidden="true"
                    />

                    <span className="nutrition-meal-heading">
                      <span className="nutrition-meal-title">
                        {meal.label}
                      </span>

                      <UpdatedByBadge
                        username={mealUpdatedByUsername}
                      />

                      <span className="nutrition-meal-summary">
                        {activeMealItems.length === 0
                          ? mealItems.length > 0
                            ? 'Нет активных продуктов'
                            : 'Пока пусто'
                          : `Б ${formatNutrient(mealTotals.protein)} · Ж ${formatNutrient(mealTotals.fat)} · У ${formatNutrient(mealTotals.carbs)}`}
                      </span>
                    </span>

                    <span className="nutrition-meal-kcal">
                      {Math.round(mealTotals.kcal)} ккал
                    </span>
                  </button>

                  {canEditPlan && (
                    <button
                      className="nutrition-meal-add"
                      type="button"
                      aria-label={`Добавить продукт: ${meal.label}`}
                      onClick={() => setAddingMeal(meal.value)}
                    >
                      <Plus size={18} aria-hidden="true" />
                    </button>
                  )}
                </div>

                {isOpen && (
                  <div
                    className="nutrition-meal-panel"
                    id={panelId}
                  >
                    {mealItems.length === 0 ? (
                      <p className="nutrition-meal-empty">
                        Пока пусто
                      </p>
                    ) : (
                      <ul className="nutrition-item-list">
                        {mealItems.map((item) => (
                                                    <PlanItemRow
                            key={item.id}
                            item={item}
                            canEdit={canEditPlan}
                            updatedByUsername={
                              getForeignAuthorUsername(item)
                            }
                            onUpdateGrams={updateGrams}
                            onRemove={removeItem}
                            onRestore={restoreItem}
                            onDeletePermanently={
                              deleteItemPermanently
                            }
                          />
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </>
      )}

      {canEditPlan && addingMeal && ownerId && (
        <AddFoodSheet
          key={`${ownerId}-${selectedDate}-${addingMeal}`}
          ownerId={ownerId}
          meal={addingMeal}
          mealLabel={
            MEALS.find(
              (meal) => meal.value === addingMeal
            )?.label ?? ''
          }
          foods={foods}
          onCreateFood={addFood}
          onAdd={async (foodId, grams) => {
            if (!canEditPlan) return false

            const isAdded = await addItem({
              date: selectedDate,
              meal: addingMeal,
              foodId,
              grams,
            })

            if (isAdded) {
              openMeal(addingMeal)
            }

            return isAdded
          }}
          onClose={() => setAddingMeal(null)}
        />
      )}

      {isExporting && ownerId && (
        <ExportSheet
          key={ownerId}
          ownerId={ownerId}
          selectedDate={selectedDate}
          onClose={() => setIsExporting(false)}
        />
      )}
    </section>
  )
}