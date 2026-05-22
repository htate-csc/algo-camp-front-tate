import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, redirect } from "@tanstack/react-router"
import { Calendar } from "lucide-react"
import { Suspense } from "react"

import { ContestsService, UsersService } from "@/client"
import { DataTable } from "@/components/Common/DataTable"
import { ongoingOrFinishedColumns } from "@/components/Contest/columns"
import PendingItems from "@/components/Pending/PendingItems"

export const Route = createFileRoute("/_layout/")({
  component: Dashboard,
  beforeLoad: async () => {
    const user = await UsersService.readUserMe()
    if (user.is_superuser) {
      throw redirect({
        to: "/admin/contests",
      })
    }
  },
  head: () => ({
    meta: [
      {
        title: "コンテスト一覧 - WA Rev.",
      },
    ],
  }),
})

function ContestsContent() {
  // 一般向けページでは `ongoing` なコンテストのみ取得
  const { data: contestsData } = useSuspenseQuery({
    queryKey: ["contests", "ongoing"],
    queryFn: () => ContestsService.readContests({ status: "ongoing" }),
  })

  const ongoing = contestsData?.data ?? []

  if (ongoing.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-12 border rounded-lg bg-card">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Calendar className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold">
          開催中のコンテストはありません
        </h3>
        <p className="text-muted-foreground">
          新しいコンテストが開始されるまでお待ちください
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-3">
        <DataTable columns={ongoingOrFinishedColumns} data={ongoing} />
      </div>
    </div>
  )
}

function Dashboard() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            開催中のコンテスト
          </h1>
        </div>
      </div>
      <Suspense fallback={<PendingItems />}>
        <ContestsContent />
      </Suspense>
    </div>
  )
}
