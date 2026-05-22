import type { ColumnDef } from "@tanstack/react-table"

import type { UserPublic } from "@/client"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import DeleteUser from "./DeleteUser"
import EditUser from "./EditUser"

export type UserTableData = UserPublic & {
  isCurrentUser: boolean
}

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
          {row.original.isCurrentUser && (
            <Badge variant="outline" className="text-xs">
              You
            </Badge>
          )}
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
    accessorKey: "is_superuser",
    header: "ロール",
    cell: ({ row }) => (
      <Badge variant={row.original.is_superuser ? "default" : "secondary"}>
        {row.original.is_superuser ? "Superuser" : "User"}
      </Badge>
    ),
  },
  {
    id: "actions",
    header: "アクション",
    cell: ({ row }) => (
      <div className="flex justify-start">
        {!row.original.isCurrentUser && <EditUser user={row.original} />}
      </div>
    ),
  },
  {
    id: "delete",
    header: "",
    cell: ({ row }) => (
      <div className="flex justify-center">
        {!row.original.isCurrentUser && <DeleteUser id={row.original.id} />}
      </div>
    ),
    size: 40,
  },
]
