import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Plus, Trash2 } from "lucide-react"
import { useState } from "react"
import { useFieldArray, useForm } from "react-hook-form"
import { z } from "zod"

import {
  type ContestCreate,
  ContestProblemsService,
  ContestsService,
  ProblemsService,
} from "@/client"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import useCustomToast from "@/hooks/useCustomToast"
import { handleError } from "@/utils"

const formSchema = z
  .object({
    title: z.string().min(1, { message: "コンテスト名は必須です" }),
    start_at: z.string().min(1, { message: "開催日時は必須です" }),
    end_at: z.string().min(1, { message: "終了日時は必須です" }),
    problems: z.array(
      z.object({
        problem_id: z.string().min(1, { message: "問題を選択してください" }),
      }),
    ),
  })
  .refine(
    (data) => {
      const start = new Date(data.start_at).getTime()
      const end = new Date(data.end_at).getTime()
      return end > start
    },
    {
      message: "終了日時は開催日時より後の時間である必要があります",
      path: ["end_at"],
    },
  )

type FormData = z.infer<typeof formSchema>

const AddContest = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [confirmData, setConfirmData] = useState<FormData | null>(null)
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const { data: problemsData } = useQuery({
    queryKey: ["problems"],
    queryFn: () => ProblemsService.readProblems({ limit: 100 }),
    enabled: isOpen,
  })
  const problems = problemsData?.data || []

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      title: "",
      start_at: "",
      end_at: "",
      problems: [],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "problems",
  })

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const contestCreateData: ContestCreate = {
        title: data.title,
        start_at: new Date(data.start_at).toISOString(),
        end_at: new Date(data.end_at).toISOString(),
      }
      const contest = await ContestsService.createContest({
        requestBody: contestCreateData,
      })

      if (data.problems && data.problems.length > 0) {
        await Promise.all(
          data.problems.map((p, index) =>
            ContestProblemsService.createContestProblems({
              requestBody: {
                contest_id: contest.id,
                problem_id: p.problem_id,
                order_num: index + 1,
              },
            }),
          ),
        )
      }
      return contest
    },
    onSuccess: () => {
      showSuccessToast("コンテストを作成しました")
      form.reset()
      setConfirmData(null)
      setIsOpen(false)
    },
    onError: handleError.bind(showErrorToast),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["contests"] })
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
    mutation.mutate(confirmData)
  }

  const formatDateTime = (value: string) => {
    if (!value) {
      return "未入力"
    }
    return new Date(value).toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const selectedProblemNames =
    confirmData?.problems.map((selected) => {
      return (
        problems.find((problem) => problem.id === selected.problem_id)?.name ||
        "不明な問題"
      )
    }) || []

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="my-4">
          <Plus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        {confirmData ? (
          <>
            <DialogHeader>
              <DialogTitle>コンテスト作成の確認</DialogTitle>
              <DialogDescription>
                以下の内容でコンテストを作成してよろしいですか？
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 text-sm">
              <div>
                <p className="font-semibold">コンテスト名</p>
                <p className="mt-1 break-words pl-4">{confirmData.title}</p>
              </div>
              <div>
                <p className="font-semibold">開催日時</p>
                <p className="mt-1 pl-4">
                  {formatDateTime(confirmData.start_at)} 〜{" "}
                  {formatDateTime(confirmData.end_at)}
                </p>
              </div>
              <div>
                <p className="font-semibold">問題</p>
                {selectedProblemNames.length > 0 ? (
                  <ol className="mt-1 list-decimal space-y-1 pl-8">
                    {selectedProblemNames.map((name, index) => (
                      <li key={`${index}-${name}`} className="break-words">
                        {name}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="mt-1 pl-4 text-muted-foreground">未選択</p>
                )}
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
              <DialogTitle>コンテスト追加</DialogTitle>
              <DialogDescription>
                新しいコンテストの情報を入力してください。
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <div className="grid gap-4 py-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          コンテスト名{" "}
                          <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="コンテスト名を入力"
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
                    name="start_at"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          開催日時 <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} required />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="end_at"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          終了日時 <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} required />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* コンテストで実施する問題 */}
                  <div className="space-y-2 mt-2">
                    <FormLabel className="text-sm font-medium">
                      コンテストで実施する問題
                    </FormLabel>

                    {fields.map((field, index) => (
                      <div key={field.id} className="flex items-center gap-2">
                        <FormField
                          control={form.control}
                          name={`problems.${index}.problem_id`}
                          render={({ field: selectField }) => (
                            <FormItem className="flex-1">
                              <Select
                                onValueChange={selectField.onChange}
                                value={selectField.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="問題を選択" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {problems.map((prob) => (
                                    <SelectItem key={prob.id} value={prob.id}>
                                      {prob.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => remove(index)}
                          className="text-destructive hover:bg-destructive/10 cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}

                    {/* 指定されたデザインの「+」ボタン */}
                    <div className="flex items-center gap-2 py-2">
                      <button
                        type="button"
                        onClick={() => append({ problem_id: "" })}
                        className="flex items-center justify-center w-8 h-8 rounded-full bg-[#3b82f6] hover:bg-[#2563eb] text-white cursor-pointer transition-colors shrink-0"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <div className="flex-grow border-t border-gray-300 dark:border-gray-700" />
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <DialogClose asChild>
                    <Button
                      variant="outline"
                      type="button"
                      disabled={mutation.isPending}
                    >
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

export default AddContest
