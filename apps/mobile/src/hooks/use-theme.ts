import { DefaultCoupleBookTheme } from '@/constants/couplebook-theme';
import { useCoupleData } from '@/hooks/use-couple-data';

export function useTheme() {
  try {
    return useCoupleData().theme.colors;
  } catch {
    return DefaultCoupleBookTheme.colors;
  }
}
