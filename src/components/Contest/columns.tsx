import type { ColumnDef } from "@tanstack/react-table"
import type { ContestPublic } from "@/client"
import DeleteContest from "./DeleteContest"
import EditContest from "./EditContest"

// 日時をフォーマットするヘルパー関数
const formatDateTime = (dateStr: string | null | undefined): string => {
  if (!dateStr) return "N/A"
  try {
    return new Date(dateStr).toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return "N/A"
  }
}

// 1. 予定されているコンテスト用のカラム定義 (5列)
export const scheduledColumns: ColumnDef<ContestPublic>[] = [
  {
    accessorKey: "title",
    header: "コンテスト名",
    cell: ({ row }) => (
      <span className="font-semibold text-foreground">
        {row.original.title}
      </span>
    ),
  },
  {
    accessorKey: "start_at",
    header: "開催日時",
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {formatDateTime(row.original.start_at)}
      </span>
    ),
  },
  {
    accessorKey: "end_at",
    header: "終了日時",
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {formatDateTime(row.original.end_at)}
      </span>
    ),
  },
  {
    id: "actions",
    header: "アクション",
    cell: ({ row }) => (
      <div className="flex justify-start">
        <EditContest contest={row.original} />
      </div>
    ),
  },
  {
    id: "delete",
    header: "",
    cell: ({ row }) => (
      <div className="flex justify-center">
        <DeleteContest id={row.original.id} />
      </div>
    ),
    size: 40,
  },
]

// 2. 実施中および終了したコンテスト用のカラム定義 (3列)
// コンテスト名は表示するが、ヘッダーの列名は表示しない。開催日時と終了日時だけヘッダーに表示する。
export const ongoingOrFinishedColumns: ColumnDef<ContestPublic>[] = [
  {
    accessorKey: "title",
    header: "", // 列名は表示しない
    cell: ({ row }) => (
      <span className="font-semibold text-foreground">
        {row.original.title}
      </span>
    ),
  },
  {
    accessorKey: "start_at",
    header: "開催日時",
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {formatDateTime(row.original.start_at)}
      </span>
    ),
  },
  {
    accessorKey: "end_at",
    header: "終了日時",
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {formatDateTime(row.original.end_at)}
      </span>
    ),
  },
]
