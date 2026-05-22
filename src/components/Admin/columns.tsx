import type { ColumnDef } from "@tanstack/react-table"

import type { UserPublic } from "@/client"
import { cn } from "@/lib/utils"
import DeleteUser from "./DeleteUser"
import EditUser from "./EditUser"

export type UserTableData = UserPublic

export const columns: ColumnDef<UserTableData>[] = [
  {
    accessorKey: "full_name",
    header: "ユーザ名",
    cell: ({ row }) => {
      const fullName = row.original.full_name
      return (
        <div className="flex items-center gap-2">
          <span
            className={cn("font-medium", !fullName && "text-muted-foreground")}
          >
            {fullName || "N/A"}
          </span>
        </div>
      )
    },
  },
  {
    accessorKey: "login_id",
    header: "ログインID",
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.login_id}</span>
    ),
  },
  {
    id: "actions",
    header: "アクション",
    cell: ({ row }) => (
      <div className="flex justify-start">
        <EditUser user={row.original} />
      </div>
    ),
  },
  {
    id: "delete",
    header: "",
    cell: ({ row }) => (
      <div className="flex justify-center">
        <DeleteUser id={row.original.id} />
      </div>
    ),
    size: 40,
  },
]
