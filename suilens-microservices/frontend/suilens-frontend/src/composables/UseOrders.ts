import { useMutation, useQueryClient } from '@tanstack/vue-query';

const ORDER_API_BASE = import.meta.env.VITE_ORDER_API || 'http://localhost:3002';

interface CreateOrderPayload {
  customerName: string;
  customerEmail: string;
  lensId: string;
  branchCode: string;
  startDate: string;
  endDate: string;
}

export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateOrderPayload) => {
      const response = await fetch(`${ORDER_API_BASE}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create order');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string) => {
      const response = await fetch(`${ORDER_API_BASE}/api/orders/${orderId}/cancel`, {
        method: 'Patch',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to cancel order');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}
