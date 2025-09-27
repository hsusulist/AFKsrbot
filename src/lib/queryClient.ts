import { QueryClient } from '@tanstack/react-query';

// Create query client with default config
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors except 408, 429
        if ((error as any)?.status >= 400 && (error as any)?.status < 500) {
          if ((error as any)?.status === 408 || (error as any)?.status === 429) {
            return failureCount < 3;
          }
          return false;
        }
        return failureCount < 3;
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

// Default fetcher function
const defaultFetcher = async (url: string, options?: RequestInit) => {
  // Use the proxy in development, direct calls in production
  const baseUrl = import.meta.env.MODE === 'development' ? '' : '';
  const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;
  
  const response = await fetch(fullUrl, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
};

// API request helper for mutations
export const apiRequest = async (url: string, options?: RequestInit) => {
  return defaultFetcher(url, {
    method: 'POST',
    ...options,
  });
};

// Set default query function
queryClient.setDefaultOptions({
  queries: {
    ...queryClient.getDefaultOptions().queries,
    queryFn: ({ queryKey }) => {
      const [url] = queryKey as [string, ...any[]];
      return defaultFetcher(url);
    },
  },
});

export default queryClient;