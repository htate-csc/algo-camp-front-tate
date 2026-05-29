import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus } from "lucide-react"
import { useState } from "react"
import { type ControllerProps, type FieldPath, useForm } from "react-hook-form"
import { z } from "zod"

import { type ProblemCreate, ProblemsService } from "@/client"
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
import { LoadingButton } from "@/components/ui/loading-button"
import { Textarea } from "@/components/ui/textarea"
import useCustomToast from "@/hooks/useCustomToast"
import { handleError } from "@/utils"

const formSchema = z.object({
  name: z.string().min(1, { message: "問題名は必須です" }),
  time_limit: z
    .string()
    .min(1, { message: "実行時間制限は必須です" })
    .regex(/^[0-9,.]+$/, {
      message: "半角数字、カンマ、ピリオドのみ入力可能です (例: 2,000)",
    })
    .refine(
      (val) => {
        const num = Number(val.replace(/,/g, ""))
        return !Number.isNaN(num) && num >= 0 && num <= 2000
      },
      {
        message: "実行時間制限は 2,000 ms (2秒) 以下である必要があります",
      },
    ),
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

const sampleFields = [
  {
    title: "サンプル 1",
    inputName: "sample1_input",
    outputName: "sample1_output",
    inputLabel: "入力例 1",
    outputLabel: "出力例 1",
  },
  {
    title: "サンプル 2",
    inputName: "sample2_input",
    outputName: "sample2_output",
    inputLabel: "入力例 2",
    outputLabel: "出力例 2",
  },
  {
    title: "サンプル 3",
    inputName: "sample3_input",
    outputName: "sample3_output",
    inputLabel: "入力例 3",
    outputLabel: "出力例 3",
  },
] as const

const AddProblem = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [confirmData, setConfirmData] = useState<FormData | null>(null)
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      name: "",
      time_limit: "",
      memory_limit: "",
      content: "",
      input_format: "",
      output_format: "",
      sample1_input: "",
      sample1_output: "",
      sample2_input: "",
      sample2_output: "",
      sample3_input: "",
      sample3_output: "",
    },
  })

  const mutation = useMutation({
    mutationFn: (data: ProblemCreate) =>
      ProblemsService.createProblem({ requestBody: data }),
    onSuccess: () => {
      showSuccessToast("問題を作成しました")
      form.reset()
      setConfirmData(null)
      setIsOpen(false)
    },
    onError: handleError.bind(showErrorToast),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["problems"] })
    },
  })

  const buildSubmitData = (data: FormData): ProblemCreate => ({
    name: data.name,
    time_limit: Number(data.time_limit.replace(/,/g, "")),
    memory_limit: Number(data.memory_limit),
    content: data.content,
    input_format: data.input_format,
    output_format: data.output_format,
    samples: [
      { input: data.sample1_input, output: data.sample1_output },
      { input: data.sample2_input, output: data.sample2_output },
      { input: data.sample3_input, output: data.sample3_output },
    ],
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
    mutation.mutate(buildSubmitData(confirmData))
  }

  const samples = confirmData
    ? [
        {
          input: confirmData.sample1_input,
          output: confirmData.sample1_output,
        },
        {
          input: confirmData.sample2_input,
          output: confirmData.sample2_output,
        },
        {
          input: confirmData.sample3_input,
          output: confirmData.sample3_output,
        },
      ]
    : []

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="my-4">
          <Plus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        {confirmData ? (
          <>
            <DialogHeader>
              <DialogTitle>問題作成の確認</DialogTitle>
              <DialogDescription>
                以下の内容で問題を作成してよろしいですか？
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 text-sm">
              <div>
                <p className="font-semibold">問題名</p>
                <p className="mt-1 break-words pl-4">{confirmData.name}</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="font-semibold">実行時間制限</p>
                  <p className="mt-1 pl-4">
                    {Number(confirmData.time_limit.replace(/,/g, ""))} ms
                  </p>
                </div>
                <div>
                  <p className="font-semibold">メモリ制限</p>
                  <p className="mt-1 pl-4">{confirmData.memory_limit} GB</p>
                </div>
              </div>
              {[
                ["問題文", confirmData.content],
                ["入力フォーマット", confirmData.input_format],
                ["出力フォーマット", confirmData.output_format],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="font-semibold">{label}</p>
                  <p className="mt-1 max-h-28 overflow-y-auto whitespace-pre-wrap break-words rounded border bg-muted/20 p-3">
                    {value}
                  </p>
                </div>
              ))}
              <div>
                <p className="font-semibold">サンプル入出力</p>
                <div className="mt-2 space-y-3">
                  {samples.map((sample, index) => (
                    <div
                      key={`${index}-${sample.input}-${sample.output}`}
                      className="rounded border bg-muted/20 p-3"
                    >
                      <p className="font-medium">サンプル {index + 1}</p>
                      <div className="mt-2 grid gap-3 sm:grid-cols-2">
                        <div>
                          <p className="text-muted-foreground">入力例</p>
                          <p className="mt-1 max-h-20 overflow-y-auto whitespace-pre-wrap break-words font-mono text-xs">
                            {sample.input || "未入力"}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">出力例</p>
                          <p className="mt-1 max-h-20 overflow-y-auto whitespace-pre-wrap break-words font-mono text-xs">
                            {sample.output || "未入力"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter className="border-t pt-4">
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
              <DialogTitle>問題追加</DialogTitle>
              <DialogDescription>
                新しい問題の情報を入力してください。
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6 py-4"
              >
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
                          <Input
                            placeholder="問題名を入力"
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
                    name="time_limit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          実行時間制限 (ms){" "}
                          <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            inputMode="numeric"
                            pattern="[0-9,.]*"
                            autoComplete="off"
                            placeholder="2,000"
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
                    name="memory_limit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          メモリ制限 (GB){" "}
                          <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="例: 1"
                            type="text"
                            {...field}
                            required
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

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
                          <Textarea
                            placeholder="問題文を入力してください"
                            className="min-h-[120px]"
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
                    name="input_format"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          入力フォーマット{" "}
                          <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="入力形式を入力してください"
                            className="min-h-[80px]"
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
                    name="output_format"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          出力フォーマット{" "}
                          <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="出力形式を入力してください"
                            className="min-h-[80px]"
                            {...field}
                            required
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4 border-t pt-4">
                  <h3 className="text-md font-semibold tracking-tight text-foreground">
                    サンプル入出力 (3件固定)
                  </h3>

                  {sampleFields.map((sample) => (
                    <div
                      key={sample.title}
                      className="p-4 border rounded-lg bg-muted/20 space-y-4"
                    >
                      <h4 className="text-sm font-medium text-foreground">
                        {sample.title}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name={sample.inputName}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{sample.inputLabel}</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="入力例を入力"
                                  className="min-h-[70px] font-mono text-xs"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={sample.outputName}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{sample.outputLabel}</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="出力例を入力"
                                  className="min-h-[70px] font-mono text-xs"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <DialogFooter className="border-t pt-4">
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

export default AddProblem
