import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

function isClientError(error: unknown): boolean {
  const status = (error as { status?: number })?.status;
  return typeof status === 'number' && status >= 400 && status < 500;
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            gcTime: 10 * 60_000,
            retry: (failureCount, error) => failureCount < 2 && !isClientError(error),
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
