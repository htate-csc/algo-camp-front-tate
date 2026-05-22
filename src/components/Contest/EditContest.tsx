import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Pencil, Plus, Trash2 } from "lucide-react"
import { useEffect, useState } from "react"
import { useFieldArray, useForm } from "react-hook-form"
import { z } from "zod"

import {
  ContestProblemsService,
  type ContestPublic,
  ContestsService,
  type ContestUpdate,
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
        id: z.string().optional(),
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

interface EditContestProps {
  contest: ContestPublic
}

const toDatetimeLocalString = (dateStr: string | null | undefined): string => {
  if (!dateStr) return ""
  try {
    const d = new Date(dateStr)
    const tzOffset = d.getTimezoneOffset() * 60000
    return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16)
  } catch {
    return ""
  }
}

const EditContest = ({ contest }: EditContestProps) => {
  const [isOpen, setIsOpen] = useState(false)
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
      title: contest.title,
      start_at: toDatetimeLocalString(contest.start_at),
      end_at: toDatetimeLocalString(contest.end_at),
      problems: contest.problem_links
        ? [...contest.problem_links]
            .sort((a, b) => (a.order_num ?? 0) - (b.order_num ?? 0))
            .map((link) => ({
              id: link.id,
              problem_id: link.problem_id,
            }))
        : [],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "problems",
  })

  // ダイアログが開いたときにフォーム値を現在の contest 情報で初期化する
  useEffect(() => {
    if (isOpen) {
      form.reset({
        title: contest.title,
        start_at: toDatetimeLocalString(contest.start_at),
        end_at: toDatetimeLocalString(contest.end_at),
        problems: contest.problem_links
          ? [...contest.problem_links]
              .sort((a, b) => (a.order_num ?? 0) - (b.order_num ?? 0))
              .map((link) => ({
                id: link.id,
                problem_id: link.problem_id,
              }))
          : [],
      })
    }
  }, [isOpen, contest, form])

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const contestUpdateData: ContestUpdate = {
        title: data.title,
        start_at: new Date(data.start_at).toISOString(),
        end_at: new Date(data.end_at).toISOString(),
      }
      await ContestsService.updateContest({
        id: contest.id,
        requestBody: contestUpdateData,
      })

      const oldLinks = contest.problem_links || []
      const newProblems = data.problems || []

      // 削除
      const deletePromises = oldLinks
        .filter(
          (oldLink) =>
            !newProblems.some((newProb) => newProb.id === oldLink.id),
        )
        .map((link) =>
          ContestProblemsService.deleteContestProblems({ id: link.id }),
        )

      // 追加
      const addPromises = newProblems
        .filter((newProb) => !newProb.id)
        .map((newProb, index) =>
          ContestProblemsService.createContestProblems({
            requestBody: {
              contest_id: contest.id,
              problem_id: newProb.problem_id,
              order_num: index + 1,
            },
          }),
        )

      // 更新
      const updatePromises = newProblems
        .filter((newProb) => {
          if (!newProb.id) return false
          const oldLink = oldLinks.find((o) => o.id === newProb.id)
          if (!oldLink) return false
          const newOrder = newProblems.indexOf(newProb) + 1
          return (
            oldLink.problem_id !== newProb.problem_id ||
            oldLink.order_num !== newOrder
          )
        })
        .map((newProb) => {
          const newOrder = newProblems.indexOf(newProb) + 1
          return ContestProblemsService.updateContestProblems({
            id: newProb.id!,
            requestBody: {
              contest_id: contest.id,
              problem_id: newProb.problem_id,
              order_num: newOrder,
            },
          })
        })

      await Promise.all([...deletePromises, ...addPromises, ...updatePromises])
    },
    onSuccess: () => {
      showSuccessToast("コンテストを更新しました")
      setIsOpen(false)
    },
    onError: handleError.bind(showErrorToast),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["contests"] })
    },
  })

  const onSubmit = (data: FormData) => {
    mutation.mutate(data)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-1">
          <Pencil className="h-3.5 w-3.5" />
          編集
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>コンテスト編集</DialogTitle>
          <DialogDescription>
            コンテストの情報を変更して保存してください。
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
                      コンテスト名 <span className="text-destructive">*</span>
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
      </DialogContent>
    </Dialog>
  )
}

export default EditContest
