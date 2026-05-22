import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { Calendar } from "lucide-react"
import { Suspense, useMemo } from "react"

import { type ContestPublic, ContestsService } from "@/client"
import { DataTable } from "@/components/Common/DataTable"
import { ongoingOrFinishedColumns } from "@/components/Contest/columns"
import PendingItems from "@/components/Pending/PendingItems"
import useCurrentTime from "@/hooks/useCurrentTime"

export const Route = createFileRoute("/_layout/")({
  component: Dashboard,
  head: () => ({
    meta: [
      {
        title: "コンテスト一覧 - WA Rev.",
      },
    ],
  }),
})

function ContestsContent() {
  const now = useCurrentTime()

  // 一般向けページでは `ongoing` なコンテストのみ取得
  const { data: contestsData } = useSuspenseQuery({
    queryKey: ["contests", "ongoing"],
    queryFn: () => ContestsService.readContests({ status: "ongoing" }),
  })

  const rawOngoing = contestsData?.data ?? []

  // クライアント側で終了時刻を過ぎたものをリアルタイムに消去
  const ongoing = useMemo(() => {
    const ongoingList: ContestPublic[] = []

    for (const contest of rawOngoing) {
      if (!contest.start_at || !contest.end_at) {
        ongoingList.push(contest)
        continue
      }
      const start = new Date(contest.start_at).getTime()
      const end = new Date(contest.end_at).getTime()

      // 開始後かつ終了前のみ表示（終了時刻が来たら自動的に消える）
      if (start <= now && end > now) {
        ongoingList.push(contest)
      }
    }

    return ongoingList
  }, [rawOngoing, now])

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
