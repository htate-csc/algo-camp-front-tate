import type { ColumnDef } from "@tanstack/react-table"
import type { ContestPublic, ContestSummaryPublic } from "@/client"
import { Button } from "@/components/ui/button"
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
    size: 350,
    cell: ({ row }) => (
      <span className="font-semibold text-foreground">
        {row.original.title}
      </span>
    ),
  },
  {
    accessorKey: "start_at",
    header: "開始日時",
    size: 220,
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {formatDateTime(row.original.start_at)}
      </span>
    ),
  },
  {
    accessorKey: "end_at",
    header: "終了日時",
    size: 220,
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {formatDateTime(row.original.end_at)}
      </span>
    ),
  },
  {
    id: "actions",
    header: "アクション",
    size: 100,
    cell: ({ row }) => (
      <div className="flex justify-start">
        <EditContest contest={row.original} />
      </div>
    ),
  },
  {
    id: "delete",
    header: "",
    size: 60,
    cell: ({ row }) => (
      <div className="flex justify-center">
        <DeleteContest contest={row.original} />
      </div>
    ),
  },
]

// 2. 一般ユーザーの実施中コンテスト用のカラム定義 (4列)
export const ongoingOrFinishedColumns: ColumnDef<ContestSummaryPublic>[] = [
  {
    accessorKey: "title",
    header: "",
    size: 350,
    cell: ({ row }) => (
      <span className="font-semibold text-foreground">
        {row.original.title}
      </span>
    ),
  },
  {
    accessorKey: "start_at",
    header: "開始日時",
    size: 220,
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {formatDateTime(row.original.start_at)}
      </span>
    ),
  },
  {
    accessorKey: "end_at",
    header: "終了日時",
    size: 220,
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {formatDateTime(row.original.end_at)}
      </span>
    ),
  },
  {
    id: "actions",
    header: "アクション",
    size: 160,
    cell: ({ row, table }) => {
      const meta = table.options.meta as
        | { onJoinContest?: (contest: ContestSummaryPublic) => void }
        | undefined
      return (
        <div className="flex justify-start">
          <Button size="sm" onClick={() => meta?.onJoinContest?.(row.original)}>
            参加
          </Button>
        </div>
      )
    },
  },
]

// 3. 管理者の実施中・終了したコンテスト用のカラム定義 (5列・幅合わせ用ダミー列を含む)
export const adminOngoingOrFinishedColumns: ColumnDef<ContestPublic>[] = [
  {
    accessorKey: "title",
    header: "",
    size: 350,
    cell: ({ row }) => (
      <span className="font-semibold text-foreground">
        {row.original.title}
      </span>
    ),
  },
  {
    accessorKey: "start_at",
    header: "開始日時",
    size: 220,
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {formatDateTime(row.original.start_at)}
      </span>
    ),
  },
  {
    accessorKey: "end_at",
    header: "終了日時",
    size: 220,
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {formatDateTime(row.original.end_at)}
      </span>
    ),
  },
  {
    id: "blank1",
    header: "",
    size: 100,
    cell: () => null,
  },
  {
    id: "blank2",
    header: "",
    size: 60,
    cell: () => null,
  },
]
