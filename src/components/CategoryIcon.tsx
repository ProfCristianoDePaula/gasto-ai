import {
  BookOpen,
  Car,
  Clapperboard,
  Coffee,
  Gamepad2,
  GraduationCap,
  Heart,
  Home,
  Layers,
  PawPrint,
  Plane,
  ShoppingBag,
  Smartphone,
  Tag,
  Utensils,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { CATEGORIES, CategoryId, ThemeMode } from '../types/finance';

export const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  utensils: Utensils,
  car: Car,
  'graduation-cap': GraduationCap,
  clapperboard: Clapperboard,
  layers: Layers,
  tag: Tag,
  heart: Heart,
  home: Home,
  'shopping-bag': ShoppingBag,
  coffee: Coffee,
  smartphone: Smartphone,
  zap: Zap,
  plane: Plane,
  'book-open': BookOpen,
  'gamepad-2': Gamepad2,
  'paw-print': PawPrint,
};

export const CUSTOM_CATEGORY_ICON_OPTIONS: Array<{
  id: string;
  label: string;
}> = [
  { id: 'tag', label: 'Etiqueta' },
  { id: 'heart', label: 'Saúde' },
  { id: 'home', label: 'Casa' },
  { id: 'shopping-bag', label: 'Compras' },
  { id: 'coffee', label: 'Café' },
  { id: 'smartphone', label: 'Assinaturas' },
  { id: 'zap', label: 'Contas' },
  { id: 'plane', label: 'Viagem' },
  { id: 'paw-print', label: 'Pets' },
  { id: 'gamepad-2', label: 'Jogos' },
];

export const CUSTOM_CATEGORY_COLOR_OPTIONS: string[] = [
  '#6D5EF5',
  '#10B981',
  '#06B6D4',
  '#F59E0B',
  '#EF4444',
  '#EC4899',
  '#8B5CF6',
  '#3B82F6',
];

export function getCategoryColor(category: CategoryId, theme: ThemeMode): string {
  const meta = CATEGORIES[category];
  return theme === 'dark' ? meta.colorDark : meta.colorLight;
}

interface DynamicCategoryIconProps {
  icon?: string | null;
  color?: string | null;
  size?: 'sm' | 'md';
}

export function DynamicCategoryIcon({
  icon,
  color,
  size = 'md',
}: DynamicCategoryIconProps) {
  const safeColor = color && /^#[0-9A-Fa-f]{6}$/.test(color) ? color : '#64748B';
  const bg = `${safeColor}1F`;
  const dimensions = size === 'sm' ? 'w-8 h-8 rounded-lg' : 'w-10 h-10 rounded-xl';
  const iconSize = size === 'sm' ? 16 : 18;
  const IconComponent = (icon && CATEGORY_ICON_MAP[icon]) || Layers;

  return (
    <span
      className={`${dimensions} inline-flex items-center justify-center shrink-0`}
      style={{ backgroundColor: bg, color: safeColor }}
      aria-hidden="true"
    >
      <IconComponent size={iconSize} strokeWidth={2} />
    </span>
  );
}
