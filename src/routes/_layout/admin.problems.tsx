import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, redirect } from "@tanstack/react-router"
import { Search } from "lucide-react"
import { Suspense } from "react"

import { ProblemsService, UsersService } from "@/client"
import { DataTable } from "@/components/Common/DataTable"
import PendingItems from "@/components/Pending/PendingItems"
import AddProblem from "@/components/Problem/AddProblem"
import { columns } from "@/components/Problem/columns"

export const Route = createFileRoute("/_layout/admin/problems")({
  component: AdminProblems,
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
        title: "問題管理 - WA Rev.",
      },
    ],
  }),
})

function getProblemsQueryOptions() {
  return {
    queryFn: () => ProblemsService.readProblems({ skip: 0, limit: 100 }),
    queryKey: ["problems"],
  }
}

function ProblemsContent() {
  const { data: problems } = useSuspenseQuery(getProblemsQueryOptions())

  if (problems.data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-24 border rounded-lg bg-card">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Search className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold">問題が登録されていません</h3>
        <p className="text-muted-foreground">
          新しい問題を追加して開始しましょう
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <DataTable columns={columns} data={problems.data} />
    </div>
  )
}

function AdminProblems() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">問題管理</h1>
        </div>
        <AddProblem />
      </div>
      <Suspense fallback={<PendingItems />}>
        <ProblemsContent />
      </Suspense>
    </div>
  )
}
