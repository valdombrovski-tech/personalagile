import {
  Users,
  Home,
  Briefcase,
  HeartPulse,
  ShoppingCart,
  BookOpen,
  Dumbbell,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { LifeArea } from './types'

export const LIFE_AREAS: { key: LifeArea; label: string; Icon: LucideIcon }[] = [
  { key: 'meetings', label: 'Встречи и мероприятия', Icon: Users },
  { key: 'home', label: 'Домашние дела', Icon: Home },
  { key: 'work', label: 'Рабочие дела', Icon: Briefcase },
  { key: 'health', label: 'Здоровье', Icon: HeartPulse },
  { key: 'shopping', label: 'Покупки', Icon: ShoppingCart },
  { key: 'content', label: 'Контент', Icon: BookOpen },
  { key: 'sport', label: 'Спорт', Icon: Dumbbell },
]

export const LIFE_AREA_COLORS: Record<LifeArea, { bg: string; text: string }> = {
  meetings: { bg: '#E8E4FB', text: '#5B47C9' },
  home: { bg: '#FDEBD3', text: '#B5651D' },
  work: { bg: '#DCEBFB', text: '#2A6BB5' },
  health: { bg: '#FBE0E4', text: '#C2415A' },
  shopping: { bg: '#FFF3C4', text: '#9A7B00' },
  content: { bg: '#E3F4E1', text: '#3C8A36' },
  sport: { bg: '#D9F2F0', text: '#1F8A83' },
}