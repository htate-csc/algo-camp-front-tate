"use client"

import { useSuspenseQuery } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { Suspense, useEffect } from "react"

import { type UserPublic, UsersService } from "@/client"
import AddUser from "@/components/Admin/AddUser"
import { columns, type UserTableData } from "@/components/Admin/columns"
import { DataTable } from "@/components/Common/DataTable"
import PendingUsers from "@/components/Pending/PendingUsers"
import useAuth from "@/hooks/useAuth"

function getUsersQueryOptions() {
  return {
    queryFn: () => UsersService.readUsers({ skip: 0, limit: 100 }),
    queryKey: ["users"],
  }
}

function UsersTableContent() {
  const { user: currentUser } = useAuth()
  const { data: users } = useSuspenseQuery(getUsersQueryOptions())

  const tableData: UserTableData[] = users.data.filter(
    (user: UserPublic) => currentUser?.id !== user.id,
  )

  return <DataTable columns={columns} data={tableData} />
}

function UsersTable() {
  return (
    <Suspense fallback={<PendingUsers />}>
      <UsersTableContent />
    </Suspense>
  )
}

export default function AdminUsers() {
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
          <h1 className="text-2xl font-bold tracking-tight">ユーザ管理</h1>
        </div>
        <AddUser />
      </div>
      <UsersTable />
    </div>
  )
}
