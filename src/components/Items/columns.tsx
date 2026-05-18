import type { ColumnDef } from "@tanstack/react-table"
import type { ItemPublic } from "@/client"
import { ItemActionsMenu } from "./ItemActionsMenu"

export const columns: ColumnDef<ItemPublic>[] = [
  {
    accessorKey: "title",
    header: "問題名",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.title}</span>
    ),
  },
  {
    accessorKey: "title",
    header: "実行時間制限",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.title}</span>
    ),
  },
    {
    accessorKey: "title",
    header: "メモリ制限",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.title}</span>
    ),
  },
  {
    id: "actions",
    header: "アクション",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.title}</span>
    ),
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row }) => (
      <div className="flex justify-end">
        <ItemActionsMenu item={row.original} />
      </div>
    ),
  },
]
