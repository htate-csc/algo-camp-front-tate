import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { Calendar } from "lucide-react"
import { Suspense, useMemo } from "react"

import { ContestsService } from "@/client"
import { DataTable } from "@/components/Common/DataTable"
import AddContest from "@/components/Contest/AddContest"
import { scheduledColumns, ongoingOrFinishedColumns } from "@/components/Contest/columns"
import PendingItems from "@/components/Pending/PendingItems"

export const Route = createFileRoute("/_layout/")({
  component: Dashboard,
  head: () => ({
    meta: [
      {
        title: "コンテスト管理 - WA Rev.",
      },
    ],
  }),
})

function getContestsQueryOptions() {
  return {
    queryFn: () => ContestsService.readContests({ skip: 0, limit: 100 }),
    queryKey: ["contests"],
  }
}

function ContestsContent() {
  const { data: contests } = useSuspenseQuery(getContestsQueryOptions())

  const { scheduled, ongoing, finished } = useMemo(() => {
    const now = new Date().getTime()
    const list = contests.data || []

    const scheduledList = []
    const ongoingList = []
    const finishedList = []

    for (const contest of list) {
      if (!contest.start_at || !contest.end_at) {
        scheduledList.push(contest)
        continue
      }
      
      const start = new Date(contest.start_at).getTime()
      const end = new Date(contest.end_at).getTime()

      if (start > now) {
        scheduledList.push(contest)
      } else if (start <= now && end > now) {
        ongoingList.push(contest)
      } else {
        finishedList.push(contest)
      }
    }

    return {
      scheduled: scheduledList,
      ongoing: ongoingList,
      finished: finishedList,
    }
  }, [contests])

  if (contests.data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-12 border rounded-lg bg-card">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Calendar className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold">コンテストがありません</h3>
        <p className="text-muted-foreground">新しいコンテストを追加して開始しましょう</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-10">
      {/* 予定されているコンテスト */}
      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold tracking-tight border-b pb-2">予定されているコンテスト</h2>
        {scheduled.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">予定されているコンテストはありません</p>
        ) : (
          <DataTable columns={scheduledColumns} data={scheduled} />
        )}
      </div>

      {/* 実施中のコンテスト */}
      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold tracking-tight border-b pb-2">実施中のコンテスト</h2>
        {ongoing.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">実施中のコンテストはありません</p>
        ) : (
          <DataTable columns={ongoingOrFinishedColumns} data={ongoing} />
        )}
      </div>

      {/* 終了したコンテスト */}
      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold tracking-tight border-b pb-2">終了したコンテスト</h2>
        {finished.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">終了したコンテストはありません</p>
        ) : (
          <DataTable columns={ongoingOrFinishedColumns} data={finished} />
        )}
      </div>
    </div>
  )
}

function Dashboard() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">コンテスト管理</h1>
        </div>
        <AddContest />
      </div>
      <Suspense fallback={<PendingItems />}>
        <ContestsContent />
      </Suspense>
    </div>
  )
}
