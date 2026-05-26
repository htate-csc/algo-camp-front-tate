"use client"

import { useSuspenseQueries } from "@tanstack/react-query"
import { Calendar } from "lucide-react"
import { useRouter } from "next/navigation"
import { Suspense, useEffect } from "react"

import { ContestsService } from "@/client"
import { DataTable } from "@/components/Common/DataTable"
import AddContest from "@/components/Contest/AddContest"
import {
  adminOngoingOrFinishedColumns,
  scheduledColumns,
} from "@/components/Contest/columns"
import PendingItems from "@/components/Pending/PendingItems"
import useAuth from "@/hooks/useAuth"

function ContestsContent() {
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

  const ongoing = results[0].data?.data ?? []
  const scheduled = results[1].data?.data ?? []
  const finished = results[2].data?.data ?? []

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
          <DataTable columns={adminOngoingOrFinishedColumns} data={ongoing} />
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
          <DataTable columns={adminOngoingOrFinishedColumns} data={finished} />
        )}
      </div>
    </div>
  )
}

export default function AdminContestsDashboard() {
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (user && !user.is_superuser) {
      router.replace("/")
    }
  }, [user, router])

  if (!user?.is_superuser) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

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
