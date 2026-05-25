import type { ColumnDef } from "@tanstack/react-table"
import type { ContestProblemsPublic, ProblemPublic } from "@/client"
import { Button } from "@/components/ui/button"
import DeleteProblem from "./DeleteProblem"
import EditProblem from "./EditProblem"

export const columns: ColumnDef<ProblemPublic>[] = [
  {
    accessorKey: "name",
    header: "問題名",
    cell: ({ row }) => (
      <span className="font-semibold text-foreground">{row.original.name}</span>
    ),
  },
  {
    accessorKey: "time_limit",
    header: "実行時間制限",
    cell: ({ row }) => {
      const val = row.original.time_limit
      const formatted =
        val !== undefined && val !== null
          ? val.toLocaleString("en-US", { maximumFractionDigits: 3 })
          : "N/A"
      return <span className="text-muted-foreground">{formatted} ms</span>
    },
  },
  {
    accessorKey: "memory_limit",
    header: "メモリ制限",
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {row.original.memory_limit} GB
      </span>
    ),
  },
  {
    id: "actions",
    header: "アクション",
    cell: ({ row }) => (
      <div className="flex justify-start">
        <EditProblem problem={row.original} />
      </div>
    ),
  },
  {
    id: "delete",
    header: "",
    cell: ({ row }) => (
      <div className="flex justify-center">
        <DeleteProblem id={row.original.id} />
      </div>
    ),
    size: 40,
  },
]

export const userProblemColumns: ColumnDef<ContestProblemsPublic>[] = [
  {
    id: "name",
    header: "問題名",
    cell: ({ row }) => {
      const problem = row.original.problem
      return (
        <div className="flex items-center gap-3">
          <span className="font-semibold text-foreground">
            {problem?.name || "N/A"}
          </span>
        </div>
      )
    },
  },
  {
    id: "time_limit",
    header: "実行時間制限",
    cell: ({ row }) => {
      const val = row.original.problem?.time_limit
      const formatted =
        val !== undefined && val !== null
          ? val.toLocaleString("en-US", { maximumFractionDigits: 3 })
          : "N/A"
      return <span className="text-muted-foreground">{formatted} ms</span>
    },
  },
  {
    id: "memory_limit",
    header: "メモリ制限",
    cell: ({ row }) => {
      const val = row.original.problem?.memory_limit
      return (
        <span className="text-muted-foreground">
          {val !== undefined && val !== null ? `${val} GB` : "N/A"}
        </span>
      )
    },
  },
  {
    id: "actions",
    header: "アクション",
    cell: ({ row, table }) => {
      const meta = table.options.meta as
        | { onStartProblem?: (problemId: string) => void }
        | undefined
      return (
        <div className="flex justify-start">
          <Button
            size="sm"
            onClick={() => {
              const problemId = row.original.problem?.id
              if (problemId) {
                meta?.onStartProblem?.(problemId)
              }
            }}
          >
            実施
          </Button>
        </div>
      )
    },
  },
]
