import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Pencil } from "lucide-react"
import { useState } from "react"
import { useForm, type ControllerProps, type FieldPath } from "react-hook-form"
import { z } from "zod"

import { ProblemsService, type ProblemPublic, type ProblemUpdate } from "@/client"
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
  FormField as FormFieldBase,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { LoadingButton } from "@/components/ui/loading-button"
import useCustomToast from "@/hooks/useCustomToast"
import { handleError } from "@/utils"

const formSchema = z.object({
  name: z.string().min(1, { message: "問題名は必須です" }),
  time_limit: z.string().min(1, { message: "実行時間制限は必須です" }),
  memory_limit: z.string().min(1, { message: "メモリ制限は必須です" }),
  content: z.string().min(1, { message: "問題文は必須です" }),
  input_format: z.string().min(1, { message: "入力フォーマットは必須です" }),
  output_format: z.string().min(1, { message: "出力フォーマットは必須です" }),
  sample1_input: z.string(),
  sample1_output: z.string(),
  sample2_input: z.string(),
  sample2_output: z.string(),
  sample3_input: z.string(),
  sample3_output: z.string(),
})

type FormData = z.infer<typeof formSchema>

const FormField = FormFieldBase as <
  TName extends FieldPath<FormData> = FieldPath<FormData>,
>({
  ...props
}: ControllerProps<FormData, TName>) => React.ReactElement

interface EditProblemProps {
  problem: ProblemPublic
}

const EditProblem = ({ problem }: EditProblemProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const samples = problem.samples || []
  const defaultValues: FormData = {
    name: problem.name,
    time_limit: problem.time_limit,
    memory_limit: String(problem.memory_limit),
    content: problem.content,
    input_format: problem.input_format,
    output_format: problem.output_format,
    sample1_input: samples[0]?.input || "",
    sample1_output: samples[0]?.output || "",
    sample2_input: samples[1]?.input || "",
    sample2_output: samples[1]?.output || "",
    sample3_input: samples[2]?.input || "",
    sample3_output: samples[2]?.output || "",
  }

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues,
  })

  const mutation = useMutation({
    mutationFn: (data: ProblemUpdate) =>
      ProblemsService.updateProblem({ id: problem.id, requestBody: data }),
    onSuccess: () => {
      showSuccessToast("問題を更新しました")
      setIsOpen(false)
    },
    onError: handleError.bind(showErrorToast),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["problems"] })
    },
  })

  const onSubmit = (data: FormData) => {
    const submitData: ProblemUpdate = {
      name: data.name,
      time_limit: data.time_limit,
      memory_limit: Number(data.memory_limit),
      content: data.content,
      input_format: data.input_format,
      output_format: data.output_format,
      samples: [
        { input: data.sample1_input, output: data.sample1_output },
        { input: data.sample2_input, output: data.sample2_output },
        { input: data.sample3_input, output: data.sample3_output },
      ],
    }
    mutation.mutate(submitData)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-1">
          <Pencil className="h-3.5 w-3.5" />
          編集
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>問題編集</DialogTitle>
          <DialogDescription>
            問題の情報を変更して保存してください。
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
            {/* 基本情報 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>
                      問題名 <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="問題名を入力" type="text" {...field} required />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="time_limit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      実行時間制限 (ms) <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="例: 2000" type="text" {...field} required />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="memory_limit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      メモリ制限 (GB) <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="例: 1" type="text" {...field} required />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* 問題文・フォーマット */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      問題文 <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea placeholder="問題文を入力してください" className="min-h-[120px]" {...field} required />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="input_format"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      入力フォーマット <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea placeholder="入力形式を入力してください" className="min-h-[80px]" {...field} required />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="output_format"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      出力フォーマット <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea placeholder="出力形式を入力してください" className="min-h-[80px]" {...field} required />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* サンプル入出力 (3つ固定) */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="text-md font-semibold tracking-tight text-foreground">サンプル入出力 (3件固定)</h3>
              
              {/* サンプル 1 */}
              <div className="p-4 border rounded-lg bg-muted/20 space-y-4">
                <h4 className="text-sm font-medium text-foreground">サンプル 1</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="sample1_input"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>入力例 1</FormLabel>
                        <FormControl>
                          <Textarea placeholder="入力例を入力" className="min-h-[70px] font-mono text-xs" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="sample1_output"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>出力例 1</FormLabel>
                        <FormControl>
                          <Textarea placeholder="出力例を入力" className="min-h-[70px] font-mono text-xs" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* サンプル 2 */}
              <div className="p-4 border rounded-lg bg-muted/20 space-y-4">
                <h4 className="text-sm font-medium text-foreground">サンプル 2</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="sample2_input"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>入力例 2</FormLabel>
                        <FormControl>
                          <Textarea placeholder="入力例を入力" className="min-h-[70px] font-mono text-xs" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="sample2_output"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>出力例 2</FormLabel>
                        <FormControl>
                          <Textarea placeholder="出力例を入力" className="min-h-[70px] font-mono text-xs" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* サンプル 3 */}
              <div className="p-4 border rounded-lg bg-muted/20 space-y-4">
                <h4 className="text-sm font-medium text-foreground">サンプル 3</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="sample3_input"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>入力例 3</FormLabel>
                        <FormControl>
                          <Textarea placeholder="入力例を入力" className="min-h-[70px] font-mono text-xs" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="sample3_output"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>出力例 3</FormLabel>
                        <FormControl>
                          <Textarea placeholder="出力例を入力" className="min-h-[70px] font-mono text-xs" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="border-t pt-4">
              <DialogClose asChild>
                <Button variant="outline" type="button" disabled={mutation.isPending}>
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

export default EditProblem
