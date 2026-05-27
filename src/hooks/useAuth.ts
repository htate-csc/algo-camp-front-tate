import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"

import {
  type Body_login_login_access_token as AccessToken,
  LoginService,
  type UserPublic,
  UsersService,
} from "@/client"
import { handleError } from "@/utils"
import useCustomToast from "./useCustomToast"

const isLoggedIn = () => {
  if (typeof window === "undefined") return false
  return localStorage.getItem("access_token") !== null
}

const useAuth = () => {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { showErrorToast } = useCustomToast()

  const { data: user } = useQuery<UserPublic | null, Error>({
    queryKey: ["currentUser"],
    queryFn: UsersService.readUserMe,
    enabled: isLoggedIn(),
  })

  const login = async (data: AccessToken): Promise<UserPublic> => {
    const response = await LoginService.loginAccessToken({
      formData: data,
    })
    localStorage.setItem("access_token", response.access_token)
    return await UsersService.readUserMe()
  }

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: (user) => {
      queryClient.setQueryData(["currentUser"], user)
      if (user.is_superuser) {
        router.push("/admin/contests")
      } else {
        router.push("/")
      }
    },
    onError: handleError.bind(showErrorToast),
  })

  const logout = () => {
    localStorage.removeItem("access_token")
    queryClient.removeQueries({ queryKey: ["currentUser"] })
    router.push("/login")
  }

  return {
    loginMutation,
    logout,
    user,
  }
}

export { isLoggedIn }
export default useAuth
