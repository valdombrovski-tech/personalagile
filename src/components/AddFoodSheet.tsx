import { useEffect, useRef, useState } from 'react'
import { Camera, X } from 'lucide-react'
import type { Food, MealType } from '../nutrition/types'
import { useMealFavorites } from '../nutrition/useMealFavorites'
import type { NewFoodInput } from '../nutrition/useFoods'
import { formatNutrient } from '../nutrition/nutrition'
import { fetchProductByBarcode } from '../nutrition/openFoodFacts'
import {
  catalogToFoodInput,
  getCatalogByBarcode,
  searchCatalog,
  type CatalogProduct,
} from '../nutrition/catalog'
import { BarcodeScanner } from './BarcodeScanner'

type AddFoodSheetProps = {
  ownerId: string
  meal: MealType
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

const NUTRIENT_FIELDS = [
  { key: 'kcal', label: 'Ккал' },
  { key: 'protein', label: 'Белки, г' },
  { key: 'fat', label: 'Жиры, г' },
  { key: 'carbs', label: 'Углеводы, г' },
  { key: 'fiber', label: 'Клетчатка, г' },
] as const

function toNumber(value: string) {
  const normalized = value.trim().replace(',', '.')
  return normalized === '' ? 0 : Number(normalized)
}

function parseBarcode(query: string): string | null {
  const digits = query.replace(/\s/g, '')
  return /^\d{8,14}$/.test(digits) ? digits : null
}

export function AddFoodSheet({
  ownerId,
  meal,
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
  const [source, setSource] =
    useState<NonNullable<NewFoodInput['source']>>('manual')

  const [lookupMessage, setLookupMessage] = useState('')
  const [isLookingUp, setIsLookingUp] = useState(false)
  const [isScanning, setIsScanning] = useState(false)

  const [catalogResults, setCatalogResults] =
    useState<CatalogProduct[]>([])
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [catalogError, setCatalogError] = useState('')
  const [actionError, setActionError] = useState('')

     const {
    favorites,
    isLoading: favoritesLoading,
    hideFavorite,
  } = useMealFavorites(meal, ownerId)

  const lookupLock = useRef(false)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true

    return () => {
      mounted.current = false
    }
  }, [])

  const query = search.trim().toLowerCase()
  const searchBarcode = parseBarcode(search)

  const filteredFoods = query
    ? foods.filter((food) => {
        if (searchBarcode) {
          return food.barcode === searchBarcode
        }

        return `${food.name} ${food.brand ?? ''} ${food.barcode ?? ''}`
          .toLowerCase()
          .includes(query)
      })
        : favorites

  const visibleCatalog = catalogResults.filter(
    (product) => !foods.some((food) => food.barcode === product.code)
  )

  const gramsValue = toNumber(grams)

  const isGramsValid =
    Number.isFinite(gramsValue) &&
    gramsValue > 0 &&
    gramsValue <= 5000

  const nutrientsValid = NUTRIENT_FIELDS.every(({ key }) => {
    const value = toNumber(form[key])
    return Number.isFinite(value) && value >= 0
  })

  const canCreate =
    !isBusy &&
    !isLookingUp &&
    form.name.trim().length > 0 &&
    form.name.trim().length <= 200 &&
    nutrientsValid

  useEffect(() => {
    let active = true

    setCatalogResults([])
    setCatalogError('')

    if (
      mode !== 'pick' ||
      selected ||
      isScanning ||
      searchBarcode ||
      query.length < 2
    ) {
      setCatalogLoading(false)
      return
    }

    setCatalogLoading(true)

    const timer = window.setTimeout(async () => {
      try {
        const products = await searchCatalog(query)

        if (active) {
          setCatalogResults(products)
        }
      } catch (error) {
        console.error('Ошибка поиска в каталоге:', error)

        if (active) {
          setCatalogError(
            'Не удалось загрузить каталог. Попробуй изменить запрос.'
          )
        }
      } finally {
        if (active) {
          setCatalogLoading(false)
        }
      }
    }, 350)

    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [query, searchBarcode, mode, selected, isScanning])

  function updateField(key: keyof typeof EMPTY_FORM, value: string) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function resetCreate() {
    setForm(EMPTY_FORM)
    setMicros({})
    setSource('manual')
    setLookupMessage('')
    setActionError('')
  }

  function openProduct(product: NewFoodInput) {
    setForm({
      name: product.name,
      brand: product.brand ?? '',
      barcode: product.barcode ?? '',
      kcal: String(product.kcal),
      protein: String(product.protein),
      fat: String(product.fat),
      carbs: String(product.carbs),
      fiber: String(product.fiber),
    })

    setMicros(product.micros ?? {})
    setSource(product.source ?? 'manual')
    setSelected(null)
    setIsScanning(false)
    setActionError('')
    setMode('create')
    setLookupMessage(
      'Данные: Open Food Facts. Проверь значения на 100 г перед сохранением.'
    )
  }

  function chooseCatalogProduct(product: CatalogProduct) {
    const existing = foods.find(
      (food) => food.barcode === product.code
    )

    if (existing) {
      setSelected(existing)
      setMode('pick')
      return
    }

    openProduct(catalogToFoodInput(product))
  }

  function startManualCreate() {
    resetCreate()

    setForm({
      ...EMPTY_FORM,
      name: searchBarcode ? '' : search.trim().slice(0, 200),
      barcode: searchBarcode ?? '',
    })

    setIsScanning(false)
    setMode('create')
  }

  async function lookupBarcode(rawBarcode: string) {
    const digits = parseBarcode(rawBarcode)

    if (lookupLock.current || isBusy) return

    if (!digits) {
      setLookupMessage('Штрихкод должен содержать от 8 до 14 цифр')
      return
    }

    const existing = foods.find((food) => food.barcode === digits)

    if (existing) {
      setSelected(existing)
      setMode('pick')
      setIsScanning(false)
      setLookupMessage('')
      return
    }

    lookupLock.current = true
    setIsLookingUp(true)
    setLookupMessage('')
    setActionError('')

    let catalogFailed = false

    try {
      let localProduct: CatalogProduct | null = null

      try {
        localProduct = await getCatalogByBarcode(digits)
      } catch (error) {
        catalogFailed = true
        console.error('Ошибка поиска штрихкода в каталоге:', error)
      }

      if (!mounted.current) return

      if (localProduct) {
        openProduct(catalogToFoodInput(localProduct))
        return
      }

      const product = await fetchProductByBarcode(digits)

      if (!mounted.current) return

      if (product) {
        openProduct({
          ...product,
          barcode: digits,
          source: 'open_food_facts',
        })
        return
      }

      resetCreate()
      setForm({ ...EMPTY_FORM, barcode: digits })
      setMode('create')

      setLookupMessage(
        catalogFailed
          ? 'Каталог недоступен, а в Open Food Facts продукт не найден. Можно заполнить вручную.'
          : 'Продукт не найден ни в каталоге, ни в Open Food Facts. Заполни данные вручную.'
      )
    } catch (error) {
      console.error('Не удалось найти продукт:', error)

      if (mounted.current) {
        setLookupMessage(
          'Не удалось завершить поиск. Попробуй позже или создай продукт вручную.'
        )
      }
    } finally {
      lookupLock.current = false

      if (mounted.current) {
        setIsLookingUp(false)
      }
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
    setActionError('')

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

      if (!mounted.current) return

      if (food) {
        setSelected(food)
        setMode('pick')
        resetCreate()
      } else {
        setActionError(
          'Не удалось сохранить продукт. Проверь данные и попробуй ещё раз.'
        )
      }
    } catch (error) {
      console.error('Ошибка создания продукта:', error)

      if (mounted.current) {
        setActionError('Не удалось сохранить продукт.')
      }
    } finally {
      if (mounted.current) {
        setIsBusy(false)
      }
    }
  }

  async function submitAdd() {
    if (!selected || !isGramsValid || isBusy) return

    setIsBusy(true)
    setActionError('')

    try {
      const isAdded = await onAdd(selected.id, gramsValue)

      if (!mounted.current) return

      if (isAdded) {
        onClose()
      } else {
        setActionError('Не удалось добавить продукт в план.')
      }
    } catch (error) {
      console.error('Ошибка добавления в план:', error)

      if (mounted.current) {
        setActionError('Не удалось добавить продукт в план.')
      }
    } finally {
      if (mounted.current) {
        setIsBusy(false)
      }
    }
  }

  const factor = isGramsValid ? gramsValue / 100 : 0

  return (
    <div className="nutrition-sheet-backdrop" onClick={onClose}>
      <div
        className="nutrition-sheet"
        role="dialog"
        aria-modal="true"
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

            {actionError && (
              <p className="nutrition-lookup-message" role="alert">
                {actionError}
              </p>
            )}

            <div className="nutrition-sheet-actions">
              <button
                className="nutrition-secondary"
                type="button"
                disabled={isBusy}
                onClick={() => {
                  setSelected(null)
                  setMode('pick')
                  setActionError('')
                }}
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
                  aria-label="Поиск продуктов"
                  placeholder="Название, бренд или штрихкод"
                  value={search}
                  disabled={isLookingUp}
                  onChange={(event) => {
                    setSearch(event.target.value)
                    setLookupMessage('')
                  }}
                />

                <button
                  className="nutrition-secondary"
                  type="button"
                  aria-label="Сканировать штрихкод"
                  disabled={isLookingUp}
                  onClick={() => setIsScanning(true)}
                >
                  <Camera size={20} aria-hidden="true" />
                </button>
              </div>
            )}

                        <h4 className="nutrition-search-heading">
              {query ? 'Мои и общие продукты' : `Часто добавляешь · ${mealLabel}`}
            </h4>

                        {actionError && (
              <p className="nutrition-lookup-message" role="alert">
                {actionError}
              </p>
            )}

            {filteredFoods.length === 0 ? (
              <p className="nutrition-meal-empty">
                {query
                  ? 'В сохранённых продуктах ничего не найдено'
                  : favoritesLoading
                    ? 'Загружаем…'
                    : 'Здесь появятся продукты, которые ты добавляешь в этот приём пищи. Найди нужный через поиск.'}
              </p>
            ) : (
              <ul className="nutrition-food-list">
                {filteredFoods.map((food) => (
                                    <li key={food.id} className="nutrition-food-choice-row">
                    <button
                      className="nutrition-food-button"
                      type="button"
                      disabled={isLookingUp}
                      onClick={() => {
                        setIsScanning(false)
                        setActionError('')
                        setSelected(food)
                      }}
                    >
                      <span className="nutrition-food-name">
                        {food.name}
                        {food.brand ? ` · ${food.brand}` : ''}
                      </span>

                                            <span className="nutrition-food-kcal">
                        {Math.round(food.kcal)} ккал / 100 г
                      </span>
                    </button>

                    {!query && (
                      <button
                        className="nutrition-favorite-hide"
                        type="button"
                        disabled={isLookingUp}
                        aria-label={`Скрыть из популярных: ${food.name}`}
                        title="Скрыть из популярных"
                        onClick={() => {
                          const hidden = hideFavorite(food.id)

                          setActionError(
                            hidden
                              ? ''
                              : 'Не удалось сохранить скрытие продукта.'
                          )
                        }}
                      >
                        <X size={14} aria-hidden="true" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {!searchBarcode && query.length >= 2 && !isScanning && (
              <>
                <h4 className="nutrition-search-heading">
                  Каталог · Open Food Facts
                </h4>

                {catalogLoading ? (
                  <p className="nutrition-lookup-message">
                    Ищем в каталоге…
                  </p>
                ) : catalogError ? (
                  <p className="nutrition-lookup-message" role="alert">
                    {catalogError}
                  </p>
                ) : visibleCatalog.length === 0 ? (
                  <p className="nutrition-meal-empty">
                    Новых совпадений в каталоге нет
                  </p>
                ) : (
                  <>
                    <ul className="nutrition-food-list">
                      {visibleCatalog.map((product) => (
                        <li key={product.code}>
                          <button
                            className="nutrition-food-button"
                            type="button"
                            disabled={isLookingUp}
                            onClick={() => chooseCatalogProduct(product)}
                          >
                            <span className="nutrition-food-name">
                              {product.name}
                              {product.brand ? ` · ${product.brand}` : ''}
                            </span>

                            <span className="nutrition-food-kcal">
                              {Math.round(product.kcal)} ккал / 100 г
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>

                    <p className="nutrition-lookup-message">
                      До 20 результатов. Уточни запрос, если нужного нет.
                    </p>
                  </>
                )}
              </>
            )}

            {!searchBarcode && query.length < 2 && (
              <p className="nutrition-lookup-message">
                Для поиска в каталоге введи минимум 2 символа.
              </p>
            )}

            {searchBarcode &&
              filteredFoods.length === 0 &&
              !isScanning && (
                <button
                  className="nutrition-secondary"
                  type="button"
                  disabled={isLookingUp}
                  onClick={() => void lookupBarcode(searchBarcode)}
                >
                  {isLookingUp
                    ? 'Ищем…'
                    : 'Найти по штрихкоду'}
                </button>
              )}

            {isLookingUp && (
              <p className="nutrition-lookup-message" role="status">
                Проверяем каталог и Open Food Facts…
              </p>
            )}

            {lookupMessage && (
              <p className="nutrition-lookup-message" role="status">
                {lookupMessage}
              </p>
            )}

            <button
              className="nutrition-primary"
              type="button"
              disabled={isLookingUp}
              onClick={startManualCreate}
            >
              Новый продукт вручную
            </button>
          </div>
        ) : (
          <div className="nutrition-sheet-body">
            <p className="nutrition-meal-empty">
              Все значения указывай на 100 г продукта.
              Для круп и макарон — в сухом виде.
            </p>

            <label className="nutrition-field">
              <span>Название</span>
              <input
                type="text"
                maxLength={200}
                value={form.name}
                autoFocus
                disabled={isBusy || isLookingUp}
                onChange={(event) => updateField('name', event.target.value)}
              />
            </label>

            <label className="nutrition-field">
              <span>Бренд (необязательно)</span>
              <input
                type="text"
                value={form.brand}
                disabled={isBusy || isLookingUp}
                onChange={(event) => updateField('brand', event.target.value)}
              />
            </label>

            <div className="nutrition-field">
              <label htmlFor="nutrition-food-barcode">
                Штрихкод (необязательно)
              </label>

              <div className="nutrition-barcode-row">
                <input
                  id="nutrition-food-barcode"
                  type="text"
                  inputMode="numeric"
                  value={form.barcode}
                  disabled={isBusy || isLookingUp}
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
              <p className="nutrition-lookup-message" role="status">
                {lookupMessage}
              </p>
            )}

            <div className="nutrition-field-grid">
              {NUTRIENT_FIELDS.map(({ key, label }) => (
                <label className="nutrition-field" key={key}>
                  <span>{label}</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={form[key]}
                    disabled={isBusy || isLookingUp}
                    onChange={(event) =>
                      updateField(key, event.target.value)
                    }
                  />
                </label>
              ))}
            </div>

            {actionError && (
              <p className="nutrition-lookup-message" role="alert">
                {actionError}
              </p>
            )}

            <div className="nutrition-sheet-actions">
              <button
                className="nutrition-secondary"
                type="button"
                disabled={isBusy || isLookingUp}
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