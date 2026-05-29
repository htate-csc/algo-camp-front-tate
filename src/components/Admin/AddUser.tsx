import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { type UserCreate, UsersService } from "@/client"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { LoadingButton } from "@/components/ui/loading-button"
import useCustomToast from "@/hooks/useCustomToast"
import { handleError } from "@/utils"

const formSchema = z
  .object({
    login_id: z.string().min(1, { message: "ログインIDは必須です" }),
    full_name: z.string().min(1, { message: "ユーザ名は必須です" }),
    password: z
      .string()
      .min(1, { message: "ログインパスワードは必須です" })
      .min(8, { message: "ログインパスワードは8文字以上で入力してください" }),
    confirm_password: z
      .string()
      .min(1, { message: "ログインパスワード（再入力）は必須です" }),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "ログインパスワードが一致しません",
    path: ["confirm_password"],
  })

type FormData = z.infer<typeof formSchema>

const AddUser = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [confirmData, setConfirmData] = useState<FormData | null>(null)
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      login_id: "",
      full_name: "",
      password: "",
      confirm_password: "",
    },
  })

  const mutation = useMutation({
    mutationFn: (data: UserCreate) =>
      UsersService.createUser({ requestBody: data }),
    onSuccess: () => {
      showSuccessToast("ユーザを作成しました")
      form.reset()
      setConfirmData(null)
      setIsOpen(false)
    },
    onError: handleError.bind(showErrorToast),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
    },
  })

  const onSubmit = (data: FormData) => {
    setConfirmData(data)
  }

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (!open) {
      setConfirmData(null)
    }
  }

  const handleConfirm = () => {
    if (!confirmData) {
      return
    }
    const { confirm_password, ...userCreate } = confirmData
    mutation.mutate(userCreate)
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="my-4">
          <Plus />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {confirmData ? (
          <>
            <DialogHeader>
              <DialogTitle>ユーザ作成の確認</DialogTitle>
              <DialogDescription>
                以下の内容でユーザを作成してよろしいですか？
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 text-sm">
              <div>
                <p className="font-semibold">ユーザ名</p>
                <p className="mt-1 break-words pl-4">{confirmData.full_name}</p>
              </div>
              <div>
                <p className="font-semibold">ログインID</p>
                <p className="mt-1 break-words pl-4">{confirmData.login_id}</p>
              </div>
              <div>
                <p className="font-semibold">ログインパスワード</p>
                <p className="mt-1 pl-4">
                  入力済み（{confirmData.password.length}文字）
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                type="button"
                disabled={mutation.isPending}
                onClick={() => setConfirmData(null)}
              >
                いいえ
              </Button>
              <LoadingButton
                type="button"
                loading={mutation.isPending}
                onClick={handleConfirm}
              >
                はい
              </LoadingButton>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>ユーザ追加</DialogTitle>
              <DialogDescription>
                新しいユーザの情報を入力してください。
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <div className="grid gap-4 py-4">
                  <FormField
                    control={form.control}
                    name="login_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          ログインID <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="ログインID"
                            type="text"
                            {...field}
                            required
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="full_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          ユーザ名 <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="ユーザ名"
                            type="text"
                            {...field}
                            required
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          ログインパスワード{" "}
                          <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="ログインパスワード"
                            type="password"
                            autoComplete="new-password"
                            {...field}
                            required
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="confirm_password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          ログインパスワード（再入力）{" "}
                          <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="ログインパスワード（再入力）"
                            type="password"
                            autoComplete="new-password"
                            {...field}
                            required
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline" disabled={mutation.isPending}>
                      キャンセル
                    </Button>
                  </DialogClose>
                  <LoadingButton type="submit" loading={mutation.isPending}>
                    保存
                  </LoadingButton>
                </DialogFooter>
              </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default AddUser
