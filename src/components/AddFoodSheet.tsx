import { useState } from 'react'
import { Camera, X } from 'lucide-react'
import type { Food } from '../nutrition/types'
import type { NewFoodInput } from '../nutrition/useFoods'
import { formatNutrient } from '../nutrition/nutrition'
import { fetchProductByBarcode } from '../nutrition/openFoodFacts'
import { BarcodeScanner } from './BarcodeScanner'

type AddFoodSheetProps = {
  mealLabel: string
  foods: Food[]
  onCreateFood: (input: NewFoodInput) => Promise<Food | null>
  onAdd: (foodId: string, grams: number) => Promise<boolean>
  onClose: () => void
}

const EMPTY_FORM = {
  name: '',
  brand: '',
  barcode: '',
  kcal: '',
  protein: '',
  fat: '',
  carbs: '',
  fiber: '',
}

function toNumber(value: string) {
  const normalized = value.trim().replace(',', '.')
  return normalized === '' ? 0 : Number(normalized)
}

function parseBarcode(query: string): string | null {
  const digits = query.replace(/\s/g, '')
  return /^\d{8,14}$/.test(digits) ? digits : null
}

export function AddFoodSheet({
  mealLabel,
  foods,
  onCreateFood,
  onAdd,
  onClose,
}: AddFoodSheetProps) {
  const [mode, setMode] = useState<'pick' | 'create'>('pick')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Food | null>(null)
  const [grams, setGrams] = useState('100')
  const [form, setForm] = useState(EMPTY_FORM)
  const [isBusy, setIsBusy] = useState(false)
  const [micros, setMicros] = useState<Record<string, number>>({})
  const [source, setSource] = useState<'manual' | 'open_food_facts'>('manual')
  const [lookupMessage, setLookupMessage] = useState('')
  const [isLookingUp, setIsLookingUp] = useState(false)

    const [isScanning, setIsScanning] = useState(false)

  const query = search.trim().toLowerCase()
  const searchBarcode = parseBarcode(search)

  const filteredFoods = query
    ? foods.filter((food) =>
        `${food.name} ${food.brand ?? ''} ${food.barcode ?? ''}`
          .toLowerCase()
          .includes(query)
      )
    : foods

  const gramsValue = toNumber(grams)

  const isGramsValid =
    Number.isFinite(gramsValue) && gramsValue > 0 && gramsValue <= 5000

  const canCreate = !isBusy && form.name.trim().length > 0

  function updateField(key: keyof typeof EMPTY_FORM, value: string) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function resetCreate() {
    setForm(EMPTY_FORM)
    setMicros({})
    setSource('manual')
    setLookupMessage('')
  }

  async function lookupBarcode(rawBarcode: string) {
    const digits = rawBarcode.replace(/\D/g, '')

    if (isLookingUp) return

    if (digits.length < 8 || digits.length > 14) {
      setLookupMessage('Штрихкод должен содержать от 8 до 14 цифр')
      return
    }

    const existing = foods.find((food) => food.barcode === digits)

    if (existing) {
      setSelected(existing)
      return
    }

    setIsLookingUp(true)
    setLookupMessage('')

    try {
      const product = await fetchProductByBarcode(digits)

      if (!product) {
        setForm((current) => ({ ...current, barcode: digits }))
        setMode('create')
        setLookupMessage('Продукт не найден. Заполни данные вручную.')
        return
      }

      setForm({
        name: product.name,
        brand: product.brand ?? '',
        barcode: digits,
        kcal: String(product.kcal),
        protein: String(product.protein),
        fat: String(product.fat),
        carbs: String(product.carbs),
        fiber: String(product.fiber),
      })

      setMicros(product.micros ?? {})
      setSource('open_food_facts')
      setMode('create')

      setLookupMessage(
        'Данные: Open Food Facts. Проверь значения перед сохранением.'
      )
    } catch (lookupError) {
      console.error('Не удалось найти продукт:', lookupError)

      setLookupMessage(
        'Не удалось связаться с Open Food Facts. Попробуй позже или заполни вручную.'
      )
    } finally {
      setIsLookingUp(false)
    }
  }

  function handleScanned(code: string) {
    setIsScanning(false)
    setSearch(code)
    void lookupBarcode(code)
  }

  async function submitFood() {
    if (!canCreate) return

    setIsBusy(true)

    try {
      const food = await onCreateFood({
        name: form.name,
        brand: form.brand,
        barcode: form.barcode,
        kcal: toNumber(form.kcal),
        protein: toNumber(form.protein),
        fat: toNumber(form.fat),
        carbs: toNumber(form.carbs),
        fiber: toNumber(form.fiber),
        micros,
        source,
      })

      if (food) {
        setSelected(food)
        setMode('pick')
        resetCreate()
      }
    } finally {
      setIsBusy(false)
    }
  }

  async function submitAdd() {
    if (!selected || !isGramsValid || isBusy) return

    setIsBusy(true)

    try {
      const isAdded = await onAdd(selected.id, gramsValue)

      if (isAdded) {
        onClose()
      }
    } finally {
      setIsBusy(false)
    }
  }

  const factor = isGramsValid ? gramsValue / 100 : 0

  return (
    <div className="nutrition-sheet-backdrop" onClick={onClose}>
      <div
        className="nutrition-sheet"
        role="dialog"
        aria-label={`Добавить продукт: ${mealLabel}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="nutrition-sheet-header">
          <h3>Добавить: {mealLabel}</h3>

          <button type="button" aria-label="Закрыть" onClick={onClose}>
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {selected ? (
          <div className="nutrition-sheet-body">
            <p className="nutrition-selected-name">
              {selected.name}
              {selected.brand ? ` · ${selected.brand}` : ''}
            </p>

            <label className="nutrition-field">
              <span>Вес, г</span>

              <input
                type="text"
                inputMode="decimal"
                value={grams}
                autoFocus
                onChange={(event) => setGrams(event.target.value)}
              />
            </label>

            <p className="nutrition-preview">
              {Math.round(selected.kcal * factor)} ккал · Б{' '}
              {formatNutrient(selected.protein * factor)} · Ж{' '}
              {formatNutrient(selected.fat * factor)} · У{' '}
              {formatNutrient(selected.carbs * factor)}
            </p>

            <div className="nutrition-sheet-actions">
              <button
                className="nutrition-secondary"
                type="button"
                disabled={isBusy}
                onClick={() => setSelected(null)}
              >
                Назад
              </button>

              <button
                className="nutrition-primary"
                type="button"
                disabled={!isGramsValid || isBusy}
                onClick={() => void submitAdd()}
              >
                {isBusy ? 'Добавляем…' : 'Добавить'}
              </button>
            </div>
          </div>
        ) : mode === 'pick' ? (
          <div className="nutrition-sheet-body">
                        {isScanning ? (
              <BarcodeScanner
                onDetected={handleScanned}
                onClose={() => setIsScanning(false)}
              />
            ) : (
              <div className="nutrition-barcode-row">
                <input
                  className="nutrition-search"
                  type="search"
                  placeholder="Название или штрихкод"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value)
                    setLookupMessage('')
                  }}
                />

                <button
                  className="nutrition-secondary"
                  type="button"
                  aria-label="Сканировать штрихкод"
                  onClick={() => setIsScanning(true)}
                >
                  <Camera size={20} aria-hidden="true" />
                </button>
              </div>
            )}

            {isLookingUp && (
              <p className="nutrition-lookup-message">Ищем…</p>
            )}

            {filteredFoods.length === 0 ? (
              <p className="nutrition-meal-empty">
                {foods.length === 0
                  ? 'Продуктов пока нет. Создай первый.'
                  : 'Среди твоих продуктов ничего не найдено'}
              </p>
            ) : (
              <ul className="nutrition-food-list">
                {filteredFoods.map((food) => (
                  <li key={food.id}>
                    <button
                      className="nutrition-food-button"
                      type="button"
                      onClick={() => setSelected(food)}
                    >
                      <span className="nutrition-food-name">
                        {food.name}
                        {food.brand ? ` · ${food.brand}` : ''}
                      </span>

                      <span className="nutrition-food-kcal">
                        {Math.round(food.kcal)} ккал / 100 г
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {searchBarcode && filteredFoods.length === 0 && (
              <button
                className="nutrition-secondary"
                type="button"
                disabled={isLookingUp}
                onClick={() => void lookupBarcode(searchBarcode)}
              >
                {isLookingUp ? 'Ищем…' : 'Найти в Open Food Facts'}
              </button>
            )}

            {lookupMessage && (
              <p className="nutrition-lookup-message">{lookupMessage}</p>
            )}

            <button
              className="nutrition-primary"
              type="button"
              onClick={() => {
                resetCreate()
                setMode('create')
              }}
            >
              Новый продукт
            </button>
          </div>
        ) : (
          <div className="nutrition-sheet-body">
            <p className="nutrition-meal-empty">
              Все значения указывай на 100 г продукта
            </p>

            <label className="nutrition-field">
              <span>Название</span>
              <input
                type="text"
                maxLength={200}
                value={form.name}
                autoFocus
                onChange={(event) => updateField('name', event.target.value)}
              />
            </label>

            <label className="nutrition-field">
              <span>Бренд (необязательно)</span>
              <input
                type="text"
                value={form.brand}
                onChange={(event) => updateField('brand', event.target.value)}
              />
            </label>

            <div className="nutrition-field">
              <span>Штрихкод (необязательно)</span>

              <div className="nutrition-barcode-row">
                <input
                  type="text"
                  inputMode="numeric"
                  value={form.barcode}
                  onChange={(event) =>
                    updateField('barcode', event.target.value)
                  }
                />

                <button
                  className="nutrition-secondary"
                  type="button"
                  disabled={
                    isLookingUp || isBusy || form.barcode.trim() === ''
                  }
                  onClick={() => void lookupBarcode(form.barcode)}
                >
                  {isLookingUp ? 'Ищем…' : 'Найти'}
                </button>
              </div>
            </div>

            {lookupMessage && (
              <p className="nutrition-lookup-message">{lookupMessage}</p>
            )}

            <div className="nutrition-field-grid">
              <label className="nutrition-field">
                <span>Ккал</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={form.kcal}
                  onChange={(event) => updateField('kcal', event.target.value)}
                />
              </label>

              <label className="nutrition-field">
                <span>Белки, г</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={form.protein}
                  onChange={(event) =>
                    updateField('protein', event.target.value)
                  }
                />
              </label>

              <label className="nutrition-field">
                <span>Жиры, г</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={form.fat}
                  onChange={(event) => updateField('fat', event.target.value)}
                />
              </label>

              <label className="nutrition-field">
                <span>Углеводы, г</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={form.carbs}
                  onChange={(event) => updateField('carbs', event.target.value)}
                />
              </label>

              <label className="nutrition-field">
                <span>Клетчатка, г</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={form.fiber}
                  onChange={(event) => updateField('fiber', event.target.value)}
                />
              </label>
            </div>

            <div className="nutrition-sheet-actions">
              <button
                className="nutrition-secondary"
                type="button"
                disabled={isBusy}
                onClick={() => {
                  resetCreate()
                  setMode('pick')
                }}
              >
                Отмена
              </button>

              <button
                className="nutrition-primary"
                type="button"
                disabled={!canCreate}
                onClick={() => void submitFood()}
              >
                {isBusy ? 'Создаём…' : 'Создать'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}