import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { getTodayString } from '../lib/dates'
import { usePlanItems } from '../nutrition/usePlanItems'
import { MEALS, type MealType } from '../nutrition/types'
import { useFoods } from '../nutrition/useFoods'
import { AddFoodSheet } from '../components/AddFoodSheet'
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

export function NutritionPlannerView() {
  const today = getTodayString()

  const [weekStart, setWeekStart] = useState(() => getMonday(today))
  const [selectedDate, setSelectedDate] = useState(today)

  const weekDates = Array.from({ length: 7 }, (_, index) =>
    shiftDate(weekStart, index)
  )

  const weekEnd = weekDates[6]

  const { items, isLoading, error, addItem } = usePlanItems(
    weekStart,
    weekEnd
  )

  const { foods, error: foodsError, addFood } = useFoods()

  const [addingMeal, setAddingMeal] = useState<MealType | null>(null)

  const dayItems = items.filter((item) => item.plan_date === selectedDate)
  const dayTotals = sumTotals(dayItems)

  function changeWeek(offset: number) {
    setWeekStart((current) => shiftDate(current, offset * 7))
    setSelectedDate((current) => shiftDate(current, offset * 7))
  }

  return (
    <section className="nutrition-page">
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
            items.filter((item) => item.plan_date === date)
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

      {isLoading ? (
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
              <span className="nutrition-summary-label">ккал</span>
            </div>

            <div className="nutrition-summary-item">
              <span className="nutrition-summary-value">
                {formatNutrient(dayTotals.protein)}
              </span>
              <span className="nutrition-summary-label">белки, г</span>
            </div>

            <div className="nutrition-summary-item">
              <span className="nutrition-summary-value">
                {formatNutrient(dayTotals.fat)}
              </span>
              <span className="nutrition-summary-label">жиры, г</span>
            </div>

            <div className="nutrition-summary-item">
              <span className="nutrition-summary-value">
                {formatNutrient(dayTotals.carbs)}
              </span>
              <span className="nutrition-summary-label">углеводы, г</span>
            </div>
          </div>

          {MEALS.map((meal) => {
            const mealItems = dayItems.filter(
              (item) => item.meal === meal.value
            )
            const mealTotals = sumTotals(mealItems)

            return (
              <div className="nutrition-meal" key={meal.value}>
                <div className="nutrition-meal-header">
                  <span className="nutrition-meal-title">{meal.label}</span>

                  <span className="nutrition-meal-kcal">
                    {Math.round(mealTotals.kcal)} ккал
                  </span>
                </div>

                <p className="nutrition-meal-macros">
                  Б {formatNutrient(mealTotals.protein)} · Ж{' '}
                  {formatNutrient(mealTotals.fat)} · У{' '}
                  {formatNutrient(mealTotals.carbs)}
                </p>

                {mealItems.length === 0 ? (
                  <p className="nutrition-meal-empty">Пока пусто</p>
                ) : (
                  <ul className="nutrition-item-list">
                    {mealItems.map((item) => (
                      <li className="nutrition-item" key={item.id}>
                        <span className="nutrition-item-name">
                          {item.food.name}
                        </span>

                        <span className="nutrition-item-grams">
                          {formatNutrient(item.grams)} г
                        </span>

                        <span className="nutrition-item-kcal">
                          {Math.round(sumTotals([item]).kcal)} ккал
                        </span>
                      </li>
                    ))}
                                   </ul>
                )}

                <button
                  className="nutrition-add-button"
                  type="button"
                  onClick={() => setAddingMeal(meal.value)}
                >
                  + Добавить продукт
                </button>
              </div>
            )
          })}
        </>
      )}

      {addingMeal && (
        <AddFoodSheet
          mealLabel={
            MEALS.find((meal) => meal.value === addingMeal)?.label ?? ''
          }
          foods={foods}
          onCreateFood={addFood}
          onAdd={(foodId, grams) =>
            addItem({
              date: selectedDate,
              meal: addingMeal,
              foodId,
              grams,
            })
          }
          onClose={() => setAddingMeal(null)}
        />
      )}

    </section>
  )
}