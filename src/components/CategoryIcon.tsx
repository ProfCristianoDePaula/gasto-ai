import {
  Car,
  Clapperboard,
  GraduationCap,
  Layers,
  Utensils,
} from 'lucide-react';
import { CATEGORIES, CategoryId, ThemeMode } from '../types/finance';

export function getCategoryColor(category: CategoryId, theme: ThemeMode): string {
  const meta = CATEGORIES[category];
  return theme === 'dark' ? meta.colorDark : meta.colorLight;
}

interface CategoryIconProps {
  category: CategoryId;
  theme: ThemeMode;
  size?: 'sm' | 'md';
}

export function CategoryIcon({
  category,
  theme,
  size = 'md',
}: CategoryIconProps) {
  const color = getCategoryColor(category, theme);
  const bg = `${color}1F`; // 12% opacity hex alpha

  const dimensions = size === 'sm' ? 'w-8 h-8 rounded-lg' : 'w-10 h-10 rounded-xl';
  const iconSize = size === 'sm' ? 16 : 18;

  const IconComponent = {
    alimentacao: Utensils,
    transporte: Car,
    educacao: GraduationCap,
    lazer: Clapperboard,
    outros: Layers,
  }[category];

  return (
    <span
      className={`${dimensions} inline-flex items-center justify-center shrink-0`}
      style={{ backgroundColor: bg, color }}
      aria-hidden="true"
    >
      <IconComponent size={iconSize} strokeWidth={2} />
    </span>
  );
}
