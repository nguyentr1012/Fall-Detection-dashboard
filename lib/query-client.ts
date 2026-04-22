import { QueryClient } from "@tanstack/react-query"

//quản lý cache của query
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
      },
})