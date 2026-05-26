"use client"

import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { ApiError, OpenAPI } from "@/client"
import { Toaster } from "@/components/ui/sonner"

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => {
    const handleApiError = (error: Error) => {
      if (error instanceof ApiError && [401, 403].includes(error.status)) {
        if (typeof window !== "undefined") {
          localStorage.removeItem("access_token")
          window.location.href = "/login"
        }
      }
    }
    return new QueryClient({
      queryCache: new QueryCache({
        onError: handleApiError,
      }),
      mutationCache: new MutationCache({
        onError: handleApiError,
      }),
    })
  })

  useEffect(() => {
    OpenAPI.BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
    OpenAPI.TOKEN = async () => {
      if (typeof window !== "undefined") {
        return localStorage.getItem("access_token") || ""
      }
      return ""
    }
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster richColors closeButton />
    </QueryClientProvider>
  )
}
