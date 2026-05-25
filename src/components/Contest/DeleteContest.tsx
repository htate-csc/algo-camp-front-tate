import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Trash2 } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"

import { type ContestPublic, ContestsService, ProblemsService } from "@/client"
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
import { LoadingButton } from "@/components/ui/loading-button"
import useCustomToast from "@/hooks/useCustomToast"
import { handleError } from "@/utils"

interface DeleteContestProps {
  contest: ContestPublic
}

const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return "N/A"
  try {
    const d = new Date(dateStr)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, "0")
    const day = String(d.getDate()).padStart(2, "0")
    const hours = String(d.getHours()).padStart(2, "0")
    const minutes = String(d.getMinutes()).padStart(2, "0")
    return `${year}-${month}-${day} ${hours}:${minutes}`
  } catch {
    return "N/A"
  }
}

const DeleteContest = ({ contest }: DeleteContestProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const { handleSubmit } = useForm()

  const { data: problemsData } = useQuery({
    queryKey: ["problems"],
    queryFn: () => ProblemsService.readProblems({ limit: 100 }),
    enabled: isOpen,
  })
  const problems = problemsData?.data || []

  const mutation = useMutation({
    mutationFn: () => ContestsService.deleteContest({ id: contest.id }),
    onSuccess: () => {
      showSuccessToast("コンテストを削除しました")
      setIsOpen(false)
    },
    onError: handleError.bind(showErrorToast),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["contests"] })
    },
  })

  const onSubmit = () => {
    mutation.mutate()
  }

  const sortedProblemLinks = contest.problem_links
    ? [...contest.problem_links].sort(
        (a, b) => (a.order_num ?? 0) - (b.order_num ?? 0),
      )
    : []

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:bg-destructive/10 cursor-pointer"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>コンテストの削除</DialogTitle>
            <DialogDescription className="text-foreground">
              以下のコンテストを本当に削除してよろしいですか？
            </DialogDescription>
          </DialogHeader>

          <div className="my-6 space-y-4 text-sm">
            <div>
              <span className="font-bold text-foreground block mb-1">
                ■コンテスト名
              </span>
              <div className="pl-4 text-muted-foreground break-all">
                {contest.title}
              </div>
            </div>
            <div>
              <span className="font-bold text-foreground block mb-1">
                ■開催日時
              </span>
              <div className="pl-4 text-muted-foreground">
                {formatDate(contest.start_at)} 〜 {formatDate(contest.end_at)}
              </div>
            </div>
            <div>
              <span className="font-bold text-foreground block mb-1">
                ■問題
              </span>
              <div className="pl-4 space-y-1">
                {sortedProblemLinks.length > 0 ? (
                  sortedProblemLinks.map((link, index) => {
                    const prob = problems.find((p) => p.id === link.problem_id)
                    return (
                      <div
                        key={link.id}
                        className="text-muted-foreground break-all"
                      >
                        {index + 1}. {prob ? prob.name : "読み込み中..."}
                      </div>
                    )
                  })
                ) : (
                  <div className="text-muted-foreground italic">
                    （登録されている問題はありません）
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="flex sm:justify-center gap-4">
            <DialogClose asChild>
              <Button
                variant="outline"
                className="w-28 cursor-pointer"
                disabled={mutation.isPending}
              >
                いいえ
              </Button>
            </DialogClose>
            <LoadingButton
              variant="destructive"
              className="w-28 cursor-pointer"
              type="submit"
              loading={mutation.isPending}
            >
              はい
            </LoadingButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default DeleteContest
