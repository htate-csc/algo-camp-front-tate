import type { ColumnDef } from "@tanstack/react-table"
import type { ProblemPublic } from "@/client"
import EditProblem from "./EditProblem"
import DeleteProblem from "./DeleteProblem"

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
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.time_limit} ms</span>
    ),
  },
  {
    accessorKey: "memory_limit",
    header: "メモリ制限",
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.memory_limit} GB</span>
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
