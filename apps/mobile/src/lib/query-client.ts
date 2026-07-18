import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

export async function clearPrivateQueryCache(): Promise<void> {
  await queryClient.cancelQueries();
  queryClient.clear();
}
