import { useSuspenseQueries } from "@tanstack/react-query"
import { createFileRoute, redirect } from "@tanstack/react-router"
import { Calendar } from "lucide-react"
import { Suspense, useMemo } from "react"

import { type ContestPublic, ContestsService, UsersService } from "@/client"
import { DataTable } from "@/components/Common/DataTable"
import AddContest from "@/components/Contest/AddContest"
import {
  ongoingOrFinishedColumns,
  scheduledColumns,
} from "@/components/Contest/columns"
import PendingItems from "@/components/Pending/PendingItems"
import useCurrentTime from "@/hooks/useCurrentTime"

export const Route = createFileRoute("/_layout/admin/contests")({
  component: AdminContestsDashboard,
  beforeLoad: async () => {
    const user = await UsersService.readUserMe()
    if (!user.is_superuser) {
      throw redirect({
        to: "/",
      })
    }
  },
  head: () => ({
    meta: [
      {
        title: "コンテスト管理 - WA Rev.",
      },
    ],
  }),
})

function ContestsContent() {
  const now = useCurrentTime()

  // 管理者専用ルートなので isSuperuser は常に true 扱い、全クエリを実行
  const results = useSuspenseQueries({
    queries: [
      {
        queryKey: ["contests", "ongoing"],
        queryFn: () => ContestsService.readContests({ status: "ongoing" }),
      },
      {
        queryKey: ["contests", "scheduled"],
        queryFn: () => ContestsService.readContests({ status: "scheduled" }),
      },
      {
        queryKey: ["contests", "finished"],
        queryFn: () => ContestsService.readContests({ status: "finished" }),
      },
    ],
  })

  const rawOngoing = results[0].data?.data ?? []
  const rawScheduled = results[1].data?.data ?? []
  const rawFinished = results[2].data?.data ?? []

  const { scheduled, ongoing, finished } = useMemo(() => {
    const scheduledList: ContestPublic[] = []
    const ongoingList: ContestPublic[] = []
    const finishedList: ContestPublic[] = []

    for (const contest of rawScheduled) {
      if (!contest.start_at || !contest.end_at) {
        scheduledList.push(contest)
        continue
      }
      const start = new Date(contest.start_at).getTime()
      if (start > now) {
        scheduledList.push(contest)
      } else {
        const end = new Date(contest.end_at).getTime()
        if (end > now) {
          ongoingList.push(contest)
        } else {
          finishedList.push(contest)
        }
      }
    }

    for (const contest of rawOngoing) {
      if (!contest.start_at || !contest.end_at) {
        ongoingList.push(contest)
        continue
      }
      const start = new Date(contest.start_at).getTime()
      const end = new Date(contest.end_at).getTime()

      if (start <= now && end > now) {
        ongoingList.push(contest)
      } else if (end <= now) {
        finishedList.push(contest)
      } else if (start > now) {
        scheduledList.push(contest)
      }
    }

    for (const contest of rawFinished) {
      finishedList.push(contest)
    }

    return {
      scheduled: scheduledList,
      ongoing: ongoingList,
      finished: finishedList,
    }
  }, [rawOngoing, rawScheduled, rawFinished, now])

  const totalContestsCount = scheduled.length + ongoing.length + finished.length

  if (totalContestsCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-12 border rounded-lg bg-card">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Calendar className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold">コンテストがありません</h3>
        <p className="text-muted-foreground">
          新しいコンテストを追加して開始しましょう
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold tracking-tight border-b pb-2">
          予定されているコンテスト
        </h2>
        {scheduled.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            予定されているコンテストはありません
          </p>
        ) : (
          <DataTable columns={scheduledColumns} data={scheduled} />
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold tracking-tight border-b pb-2">
          実施中のコンテスト
        </h2>
        {ongoing.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            実施中のコンテストはありません
          </p>
        ) : (
          <DataTable columns={ongoingOrFinishedColumns} data={ongoing} />
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold tracking-tight border-b pb-2">
          終了したコンテスト
        </h2>
        {finished.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            終了したコンテストはありません
          </p>
        ) : (
          <DataTable columns={ongoingOrFinishedColumns} data={finished} />
        )}
      </div>
    </div>
  )
}

function AdminContestsDashboard() {
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
