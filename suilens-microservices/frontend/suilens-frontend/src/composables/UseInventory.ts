import { useQuery } from '@tanstack/vue-query';
import type { MaybeRef } from 'vue';
import { toValue } from 'vue';

const INVENTORY_API_BASE = import.meta.env.VITE_INVENTORY_API || 'http://localhost:3004';

export interface Branch {
  id: string;
  code: string;
  name: string;
  address: string;
}

export interface LensBranchStock {
  inventoryId: string;
  lensId: string;
  branchCode: string;
  branchName: string;
  branchAddress: string;
  totalQuantity: number;
  availableQuantity: number;
  updatedAt: string;
}

export function useBranches() {
  return useQuery<Branch[]>({
    queryKey: ['branches'],
    queryFn: async () => {
      const response = await fetch(`${INVENTORY_API_BASE}/api/branches`);
      if (!response.ok) throw new Error('Failed to fetch branches');
      return response.json();
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useInventoryByLens(lensId: MaybeRef<string | null | undefined>) {
  return useQuery<LensBranchStock[]>({
    queryKey: ['inventory', 'lens', lensId],
    queryFn: async () => {
      const id = toValue(lensId);
      const response = await fetch(`${INVENTORY_API_BASE}/api/inventory/lenses/${id}`);
      if (!response.ok) throw new Error('Failed to fetch inventory');
      return response.json();
    },
    enabled: () => Boolean(toValue(lensId)),
    staleTime: 1000 * 30,
  });
}
