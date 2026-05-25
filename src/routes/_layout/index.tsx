import { useQuery, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, redirect } from "@tanstack/react-router"
import { ArrowLeft, Calendar, Clock, Cpu } from "lucide-react"
import { Suspense, useState } from "react"

import {
  type ContestPublic,
  ContestsService,
  ProblemsService,
  UsersService,
} from "@/client"
import { DataTable } from "@/components/Common/DataTable"
import { ongoingOrFinishedColumns } from "@/components/Contest/columns"
import PendingItems from "@/components/Pending/PendingItems"
import { userProblemColumns } from "@/components/Problem/columns"
import { Button } from "@/components/ui/button"

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

interface ProblemSolveViewProps {
  problemId: string
  onBack: () => void
}

function ProblemSolveView({ problemId, onBack }: ProblemSolveViewProps) {
  const { data: problem, isLoading } = useQuery({
    queryKey: ["problem", problemId],
    queryFn: () => ProblemsService.readProblem({ id: problemId }),
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={onBack}
          className="flex items-center gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
          問題選択に戻る
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <PendingItems />
        </div>
      ) : problem ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左半分: 問題内容 */}
          <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-2 border-r border-border/50">
            <div className="border-b pb-4">
              <h2 className="text-2xl font-bold tracking-tight">
                {problem.name}
              </h2>
              <div className="mt-2 flex gap-4 text-sm">
                <span className="flex items-center gap-1 bg-muted px-2.5 py-1 rounded-md text-foreground font-medium">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  制限時間: {problem.time_limit.toLocaleString()} ms
                </span>
                <span className="flex items-center gap-1 bg-muted px-2.5 py-1 rounded-md text-foreground font-medium">
                  <Cpu className="h-4 w-4 text-muted-foreground" />
                  メモリ制限: {problem.memory_limit} GB
                </span>
              </div>
            </div>

            {/* 問題文 */}
            <div className="space-y-2">
              <h3 className="text-lg font-bold border-l-4 border-primary pl-2">
                問題文
              </h3>
              <p className="whitespace-pre-wrap text-foreground/90 leading-relaxed bg-muted/10 p-4 rounded-lg border text-sm">
                {problem.content}
              </p>
            </div>

            {/* 入力・出力フォーマット */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h3 className="text-md font-bold border-l-4 border-primary pl-2">
                  入力
                </h3>
                <p className="whitespace-pre-wrap text-xs text-foreground/90 leading-relaxed bg-muted/10 p-4 rounded-lg border min-h-[100px]">
                  {problem.input_format}
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="text-md font-bold border-l-4 border-primary pl-2">
                  出力
                </h3>
                <p className="whitespace-pre-wrap text-xs text-foreground/90 leading-relaxed bg-muted/10 p-4 rounded-lg border min-h-[100px]">
                  {problem.output_format}
                </p>
              </div>
            </div>

            {/* サンプルテストケース */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="text-lg font-bold">サンプル入出力</h3>
              <div className="space-y-4">
                {problem.samples?.map((sample, idx) => (
                  <div
                    key={idx}
                    className="p-4 border rounded-lg bg-muted/5 space-y-3"
                  >
                    <h4 className="font-semibold text-sm">
                      サンプル {idx + 1}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <span className="text-xs font-semibold text-muted-foreground block mb-1">
                          入力例 {idx + 1}
                        </span>
                        <pre className="p-3 bg-muted font-mono text-xs rounded-md overflow-x-auto border">
                          {sample.input || "(空)"}
                        </pre>
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-muted-foreground block mb-1">
                          出力例 {idx + 1}
                        </span>
                        <pre className="p-3 bg-muted font-mono text-xs rounded-md overflow-x-auto border">
                          {sample.output || "(空)"}
                        </pre>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 右半分: エディタプレースホルダー */}
          <div className="flex flex-col border rounded-lg bg-card min-h-[450px] shadow-sm">
            <div className="flex items-center justify-between border-b px-4 py-3 bg-muted/30">
              <div className="flex items-center gap-2">
                <span className="flex h-3 w-3 rounded-full bg-destructive" />
                <span className="flex h-3 w-3 rounded-full bg-amber-500" />
                <span className="flex h-3 w-3 rounded-full bg-emerald-500" />
                <span className="text-xs text-muted-foreground font-mono ml-2">
                  editor.py (実装予定)
                </span>
              </div>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="rounded-full bg-primary/10 p-4 mb-4">
                <Cpu className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">問題実施画面 (実装予定)</h3>
              <p className="text-muted-foreground text-sm max-w-sm mt-1">
                こちらにコードエディタ、プログラミング言語の選択、テスト実行、および提出機能が実装される予定です。
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center p-6 text-muted-foreground">
          問題の読み込みに失敗しました。
        </div>
      )}
    </div>
  )
}

function ProblemsList({
  contest,
  onBack,
  onSelectProblem,
}: {
  contest: ContestPublic
  onBack: () => void
  onSelectProblem: (id: string) => void
}) {
  const problemLinks = [...(contest.problem_links || [])].sort((a, b) => {
    const aOrder = a.order_num ?? 0
    const bOrder = b.order_num ?? 0
    return aOrder - bOrder
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={onBack}
          className="flex items-center gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
          コンテスト一覧に戻る
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold tracking-tight">
          {contest.title}
        </h2>
      </div>

      {problemLinks.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-card text-muted-foreground">
          このコンテストにはまだ問題が登録されていません。
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <DataTable
            columns={userProblemColumns}
            data={problemLinks}
            meta={{
              onStartProblem: onSelectProblem,
            }}
          />
        </div>
      )}
    </div>
  )
}

function ContestsContent({
  onJoinContest,
}: {
  onJoinContest: (contest: ContestPublic) => void
}) {
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
        <DataTable
          columns={ongoingOrFinishedColumns}
          data={ongoing}
          meta={{
            onJoinContest,
          }}
        />
      </div>
    </div>
  )
}

function Dashboard() {
  const [selectedContest, setSelectedContest] = useState<ContestPublic | null>(
    null,
  )
  const [selectedProblemId, setSelectedProblemId] = useState<string | null>(
    null,
  )

  if (selectedContest && selectedProblemId) {
    return (
      <ProblemSolveView
        problemId={selectedProblemId}
        onBack={() => setSelectedProblemId(null)}
      />
    )
  }

  if (selectedContest) {
    return (
      <ProblemsList
        contest={selectedContest}
        onBack={() => setSelectedContest(null)}
        onSelectProblem={(id) => setSelectedProblemId(id)}
      />
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            開催中コンテスト一覧
          </h1>
        </div>
      </div>
      <Suspense fallback={<PendingItems />}>
        <ContestsContent
          onJoinContest={(contest) => setSelectedContest(contest)}
        />
      </Suspense>
    </div>
  )
}
