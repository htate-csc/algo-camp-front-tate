import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import useAuth from "@/hooks/useAuth"


export function User({ user }: { user: any }) {
  const { logout } = useAuth()

  if (!user) return null

  const handleLogout = async () => {
    logout()
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              data-testid="user-menu"
              onClick={handleLogout}
            >
              Log Out
            </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
