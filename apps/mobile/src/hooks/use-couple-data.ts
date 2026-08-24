import { useContext } from 'react';

import { CoupleDataContext } from '@/providers/couple-data-context';

export function useCoupleData() {
  return useContext(CoupleDataContext);
}
