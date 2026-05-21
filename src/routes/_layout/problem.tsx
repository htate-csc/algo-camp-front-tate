import { createFileRoute } from "@tanstack/react-router"
import { Search } from "lucide-react"

export const Route = createFileRoute("/_layout/problem")({
  component: Problems,
  head: () => ({
    meta: [
      {
        title: "問題管理 - WA Rev.",
      },
    ],
  }),
})

function Problems() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">問題管理</h1>
        </div>
      </div>
      
      <div className="flex flex-col items-center justify-center text-center py-24 border rounded-lg bg-card">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Search className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold">問題管理画面</h3>
        <p className="text-muted-foreground">この機能は現在実装予定です。</p>
      </div>
    </div>
  )
}
