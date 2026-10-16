import { supabase } from '../supabaseClient'
import type { NewFoodInput } from './useFoods'

export type CatalogProduct = {
  code: string
  name: string
  brand: string | null
  kcal: number
  protein: number
  fat: number
  carbs: number
  fiber: number
}

const COLUMNS = 'code,name,brand,kcal,protein,fat,carbs,fiber'

export async function searchCatalog(
  query: string
): Promise<CatalogProduct[]> {
  const text = query.trim()

  if (text.length < 2) return []

  // Не даём символам % и _ превращаться в поисковые шаблоны.
  const escaped = text
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_')

  const pattern = `%${escaped}%`

  const [byName, byBrand] = await Promise.all([
    supabase
      .from('catalog_products')
      .select(COLUMNS)
      .ilike('name', pattern)
      .order('name')
      .limit(20),

    supabase
      .from('catalog_products')
      .select(COLUMNS)
      .ilike('brand', pattern)
      .order('name')
      .limit(20),
  ])

  if (byName.error) throw byName.error
  if (byBrand.error) throw byBrand.error

  const unique = new Map<string, CatalogProduct>()

  for (const product of [
    ...(byName.data ?? []),
    ...(byBrand.data ?? []),
  ]) {
    unique.set(product.code, product as CatalogProduct)
  }

  return Array.from(unique.values())
    .sort((a, b) => a.name.localeCompare(b.name, 'ru'))
    .slice(0, 20)
}

export async function getCatalogByBarcode(
  code: string
): Promise<CatalogProduct | null> {
  const { data, error } = await supabase
    .from('catalog_products')
    .select(COLUMNS)
    .eq('code', code)
    .maybeSingle()

  if (error) throw error

  return data as CatalogProduct | null
}

export function catalogToFoodInput(
  product: CatalogProduct
): NewFoodInput {
  return {
    name: product.name,
    brand: product.brand ?? '',
    barcode: product.code,
    kcal: Number(product.kcal),
    protein: Number(product.protein),
    fat: Number(product.fat),
    carbs: Number(product.carbs),
    fiber: Number(product.fiber ?? 0),
    micros: {},
    source: 'open_food_facts',
  }
}