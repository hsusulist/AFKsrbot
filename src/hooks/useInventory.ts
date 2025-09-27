import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface InventoryItem {
  id: string;
  name: string;
  count: number;
  slot?: number;
  metadata?: string;
}

export function useInventory() {
  return useQuery({
    queryKey: ['inventory'],
    queryFn: async (): Promise<InventoryItem[]> => {
      const response = await fetch('/api/inventory');
      if (!response.ok) {
        throw new Error('Failed to fetch inventory');
      }
      return response.json();
    },
    staleTime: 5 * 1000, // 5 seconds
    refetchInterval: 10 * 1000, // Auto-refresh every 10 seconds
  });
}

export function useRefreshInventory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/inventory');
      if (!response.ok) {
        throw new Error('Failed to refresh inventory');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['inventory'], data);
    },
  });
}