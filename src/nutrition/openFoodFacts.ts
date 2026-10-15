import type { NewFoodInput } from './useFoods'

const PRODUCT_URL = 'https://world.openfoodfacts.org/api/v3/product'

// Значения микроэлементов хранятся в граммах на 100 г, как в Open Food Facts
const MICRO_KEYS = [
  'calcium',
  'iron',
  'magnesium',
  'potassium',
  'sodium',
  'zinc',
  'phosphorus',
  'vitamin-a',
  'vitamin-c',
  'vitamin-d',
  'vitamin-e',
  'vitamin-b6',
  'vitamin-b9',
  'vitamin-b12',
]

function round(value: number) {
  return Math.round(value * 100) / 100
}

function readNumber(source: Record<string, unknown>, key: string) {
  const value = source[key]

  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? value
    : undefined
}

export async function fetchProductByBarcode(
  digits: string
): Promise<NewFoodInput | null> {
  const response = await fetch(
    `${PRODUCT_URL}/${digits}.json?fields=code,product_name,brands,nutriments`
  )

  if (response.status === 404) return null
  if (!response.ok) throw new Error(`Open Food Facts: ${response.status}`)

  const json = await response.json()
  const product = json.product

  if (!product) return null

  const nutriments = (product.nutriments ?? {}) as Record<string, unknown>

  const kilojoules = readNumber(nutriments, 'energy_100g')

  const kcal =
    readNumber(nutriments, 'energy-kcal_100g') ??
    (kilojoules !== undefined ? kilojoules / 4.184 : 0)

  const micros: Record<string, number> = {}

  for (const key of MICRO_KEYS) {
    const value = readNumber(nutriments, `${key}_100g`)

    if (value !== undefined && value > 0) {
      micros[key] = value
    }
  }

  return {
    name: String(product.product_name ?? '').trim(),
    brand: String(product.brands ?? '').split(',')[0].trim(),
    barcode: digits,
    kcal: round(kcal),
    protein: round(readNumber(nutriments, 'proteins_100g') ?? 0),
    fat: round(readNumber(nutriments, 'fat_100g') ?? 0),
    carbs: round(readNumber(nutriments, 'carbohydrates_100g') ?? 0),
    fiber: round(readNumber(nutriments, 'fiber_100g') ?? 0),
    micros,
    source: 'open_food_facts',
  }
}