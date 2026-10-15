export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export const MEALS: { value: MealType; label: string }[] = [
  { value: 'breakfast', label: 'Завтрак' },
  { value: 'lunch', label: 'Обед' },
  { value: 'dinner', label: 'Ужин' },
  { value: 'snack', label: 'Перекусы' },
]

export type Food = {
  id: string
  owner_id: string
  name: string
  brand: string | null
  barcode: string | null
  kcal: number
  protein: number
  fat: number
  carbs: number
  fiber: number
  micros: Record<string, number>
  source: 'manual' | 'open_food_facts' | 'usda'
  visibility: 'private' | 'shared'
  status: 'unverified' | 'verified'
  created_at: string
}

export type PlanItem = {
  id: string
  plan_date: string
  meal: MealType
  grams: number
  position: number
  food: Food
}

export type NutrientTotals = {
  kcal: number
  protein: number
  fat: number
  carbs: number
  fiber: number
  micros: Record<string, number>
}