"use client"

import {
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { ArrowLeft, Calendar, Clock, Cpu } from "lucide-react"
import { useRouter } from "next/navigation"
import { Suspense, useEffect, useState } from "react"

import {
  AiBattlesService,
  type ContestProblemsPublic,
  type ContestSummaryPublic,
  ContestsService,
  ProblemsService,
  type SubmissionPublic,
  SubmissionsService,
} from "@/client"
import { DataTable } from "@/components/Common/DataTable"
import { ongoingOrFinishedColumns } from "@/components/Contest/columns"
import PendingItems from "@/components/Pending/PendingItems"
import { userProblemColumns } from "@/components/Problem/columns"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  type JudgeResult,
  type StepItem,
  Stepper,
} from "@/components/ui/stepper"
import { Textarea } from "@/components/ui/textarea"
import useAuth from "@/hooks/useAuth"
import useContestBoundaryClock from "@/hooks/useContestBoundaryClock"
import { cn } from "@/lib/utils"
import { extractPythonCodeFromText } from "@/lib/wa-rev/aiPrompt"

const LANGUAGES = [
  { value: "c", label: "C" },
  { value: "cpp", label: "C++" },
  { value: "python3", label: "Python 3" },
  { value: "java", label: "Java" },
  { value: "rust", label: "Rust" },
  { value: "go", label: "Go" },
  { value: "kotlin", label: "Kotlin" },
  { value: "csharp", label: "C#" },
  { value: "ruby", label: "Ruby" },
  { value: "php", label: "PHP" },
  { value: "swift", label: "Swift" },
  { value: "typescript", label: "TypeScript" },
]

const WA_REV_MODEL_IDS = [
  process.env.NEXT_PUBLIC_WA_REV_MODEL_1 || "claude-sonnet-4-5",
  process.env.NEXT_PUBLIC_WA_REV_MODEL_2 || "claude-haiku-4-5",
]

type AiGenerationState = {
  modelId: string
  rawText: string
  code: string
  isStreaming: boolean
  isEvaluating: boolean
  error: string | null
  submission: SubmissionPublic | null
}

function createInitialAiGenerations(): AiGenerationState[] {
  return WA_REV_MODEL_IDS.map((modelId) => ({
    modelId,
    rawText: "",
    code: "",
    isStreaming: false,
    isEvaluating: false,
    error: null,
    submission: null,
  }))
}

interface EditorMockupProps {
  title: string
  value: string
  theme: "user" | "ai1" | "ai2"
  placeholder?: string
}

function EditorMockup({ title, value, theme, placeholder }: EditorMockupProps) {
  const themes = {
    user: {
      bg: "bg-slate-950",
      border: "border-slate-800",
      text: "text-slate-100",
      accent: "bg-slate-800",
      tabText: "text-slate-200",
      dot: "bg-slate-500",
    },
    ai1: {
      bg: "bg-indigo-950/70",
      border: "border-indigo-900/60",
      text: "text-indigo-100",
      accent: "bg-indigo-900/40",
      tabText: "text-indigo-200",
      dot: "bg-indigo-500",
    },
    ai2: {
      bg: "bg-emerald-950/70",
      border: "border-emerald-900/60",
      text: "text-emerald-100",
      accent: "bg-emerald-900/40",
      tabText: "text-emerald-200",
      dot: "bg-emerald-500",
    },
  }

  const currentTheme = themes[theme]

  return (
    <div
      className={cn(
        "flex flex-col rounded-lg border overflow-hidden shadow-xl",
        currentTheme.border,
      )}
    >
      {/* Editor Title Bar / Tab Bar */}
      <div
        className={cn(
          "flex items-center justify-between px-3 py-2 text-xs select-none border-b",
          currentTheme.border,
          "bg-black/20",
        )}
      >
        <div className="flex items-center gap-1.5 w-16">
          <span className="w-2 h-2 rounded-full bg-rose-500/80" />
          <span className="w-2 h-2 rounded-full bg-amber-500/80" />
          <span className="w-2 h-2 rounded-full bg-emerald-500/80" />
        </div>

        <div
          className={cn(
            "flex items-center gap-2 px-3 py-1 rounded-t-md font-mono text-[10px] font-medium border-t border-x -mb-2.5",
            currentTheme.bg,
            currentTheme.border,
            currentTheme.tabText,
          )}
        >
          <span className={cn("w-1.5 h-1.5 rounded-full", currentTheme.dot)} />
          <span>solution.py</span>
        </div>

        <div className="text-[9px] font-mono text-muted-foreground tracking-wider uppercase">
          {title}
        </div>
      </div>

      <div className="relative flex-1 flex min-h-[400px]">
        {/* Fake gutter */}
        <div
          className={cn(
            "w-9 border-r font-mono text-[10px] text-right pr-2 py-4 select-none leading-relaxed flex flex-col gap-0",
            currentTheme.border,
            "bg-black/10 text-muted-foreground/30",
          )}
        >
          {Array.from({ length: 25 }).map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>

        <textarea
          value={value}
          readOnly
          className={cn(
            "flex-1 font-mono text-[11px] leading-relaxed p-4 border-0 focus:ring-0 focus:outline-none resize-none overflow-auto min-h-[400px] max-h-[500px]",
            currentTheme.bg,
            currentTheme.text,
          )}
          placeholder={placeholder}
          spellCheck={false}
        />
      </div>
    </div>
  )
}

interface ProblemSolveViewProps {
  problemId: string
  contestId: string
  onBack: () => void
}

function ProblemSolveView({
  problemId,
  contestId,
  onBack,
}: ProblemSolveViewProps) {
  const { data: problem, isLoading } = useQuery({
    queryKey: ["problem", problemId],
    queryFn: () => ProblemsService.readProblem({ id: problemId }),
  })
  const queryClient = useQueryClient()

  const [selectedLanguage, setSelectedLanguage] = useState("python3")
  const [code, setCode] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isAiDialogOpen, setIsAiDialogOpen] = useState(false)
  const [lastResults, setLastResults] = useState<(JudgeResult | null)[]>([])
  const [steps, setSteps] = useState<StepItem[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [selectedSubmissionId, setSelectedSubmissionId] = useState("")
  const [aiGenerations, setAiGenerations] = useState<AiGenerationState[]>(
    createInitialAiGenerations(),
  )
  const [_isComparisonLoading, setIsComparisonLoading] = useState(false)
  const [comparisonUserSubmission, setComparisonUserSubmission] =
    useState<SubmissionPublic | null>(null)
  const [userSourceCode, setUserSourceCode] = useState<string>("")
  const [evalComment, setEvalComment] = useState<string>("")
  const [isCommentLoading, setIsCommentLoading] = useState<boolean>(false)

  const isAiStreaming = aiGenerations.some((g) => g.isStreaming)
  const isEvaluating = aiGenerations.some((g) => g.isEvaluating)
  const hasFinished = aiGenerations.every(
    (g) => !g.isStreaming && !g.isEvaluating && (g.submission || g.error),
  )
  const hasComparison = !!comparisonUserSubmission && hasFinished

  const { data: unlockStatus } = useQuery({
    queryKey: ["problem", problemId, "unlock-status"],
    queryFn: () => SubmissionsService.readUnlockStatus({ problemId }),
    enabled: !!problem,
  })

  const { data: submissionsData } = useQuery({
    queryKey: ["problem", problemId, "submissions", "me"],
    queryFn: () => SubmissionsService.readMyProblemSubmissions({ problemId }),
    enabled: !!problem && !!unlockStatus?.unlocked,
  })

  const acPythonSubmissions = (submissionsData?.data || []).filter(
    (submission) =>
      submission.verdict === "AC" && submission.language === "python3",
  )

  const handleSubmit = async () => {
    if (!problem || !code) return
    setIsDialogOpen(true)
    setIsRunning(true)
    const initialSteps: StepItem[] = Array.from({ length: 3 }).map(
      (_, index) => ({
        id: `case-${index}`,
        title: `テストケース ${index + 1}`,
        status: "running",
      }),
    )
    setSteps(initialSteps)

    try {
      const submission = await SubmissionsService.createSubmission({
        problemId,
        requestBody: {
          contest_id: contestId,
          language: selectedLanguage,
          source_code: code,
        },
      })
      const caseResults = submission.case_results || []
      const nextSteps: StepItem[] = caseResults.map((caseResult) => ({
        id: caseResult.id,
        title: `テストケース ${caseResult.case_index + 1}`,
        status: caseResult.verdict === "AC" ? "success" : "error",
        result: caseResult.verdict as JudgeResult,
        time:
          caseResult.time_ms === null || caseResult.time_ms === undefined
            ? undefined
            : caseResult.time_ms / 1000,
        memory:
          caseResult.memory_kb === null || caseResult.memory_kb === undefined
            ? undefined
            : caseResult.memory_kb * 1024,
      }))
      setSteps(nextSteps)
      setLastResults(nextSteps.map((step) => step.result || null))
      queryClient.invalidateQueries({
        queryKey: ["problem", problemId, "unlock-status"],
      })
      queryClient.invalidateQueries({
        queryKey: ["problem", problemId, "submissions", "me"],
      })
    } catch (error) {
      console.error("Submission failed:", error)
      setSteps(
        initialSteps.map((step) => ({
          ...step,
          status: "error",
          result: "RE",
        })),
      )
      setLastResults(initialSteps.map(() => "RE"))
    } finally {
      setIsRunning(false)
    }
  }

  const handleCloseDialog = () => {
    if (isRunning) return
    setIsDialogOpen(false)
  }

  const handleOpenAiDialog = () => {
    setSelectedSubmissionId(acPythonSubmissions[0]?.id || "")
    setAiGenerations(createInitialAiGenerations())
    setIsComparisonLoading(false)
    setComparisonUserSubmission(null)
    setUserSourceCode("")
    setEvalComment("")
    setIsCommentLoading(false)
    setIsAiDialogOpen(true)
  }

  const handleStartAiBattle = async () => {
    if (!problem || !selectedSubmissionId) return

    console.group("[WA Rev] AI battle")
    console.info("[WA Rev] start", {
      problemId,
      contestId,
      selectedSubmissionId,
      modelIds: WA_REV_MODEL_IDS,
    })

    let userSub: SubmissionPublic | null = null

    setAiGenerations((prev) =>
      prev.map((g) => ({
        ...g,
        isStreaming: true,
        isEvaluating: false,
        error: null,
        rawText: "",
        code: "",
        submission: null,
      })),
    )
    setIsComparisonLoading(false)
    setComparisonUserSubmission(null)

    try {
      // Fetch user submission to get source code
      userSub = await SubmissionsService.readSubmission({
        submissionId: selectedSubmissionId,
      })
      setUserSourceCode(userSub.source_code || "")
      setComparisonUserSubmission(userSub)
    } catch (e) {
      console.warn("Could not fetch user submission code", e)
    }

    try {
      console.info("[WA Rev] creating battle")
      const battle = await AiBattlesService.createAiBattle({
        problemId,
        requestBody: {
          contest_id: contestId,
          user_submission_id: selectedSubmissionId,
          models: WA_REV_MODEL_IDS,
        },
      })
      console.info("[WA Rev] battle created", battle)

      const aiParticipants =
        battle.participants?.filter(
          (participant) => participant.participant_type === "ai",
        ) || []

      if (aiParticipants.length === 0) {
        throw new Error("AI participants were not created")
      }

      const token =
        typeof window === "undefined"
          ? ""
          : localStorage.getItem("access_token") || ""

      // start parallel generations
      await Promise.all(
        aiParticipants.map(async (aiParticipant) => {
          const modelId = aiParticipant.model_id
          if (!modelId) return

          try {
            console.info("[WA Rev] requesting stream", {
              battleId: battle.id,
              modelId,
              hasToken: !!token,
            })
            const response = await fetch(
              `/api/wa-rev/ai-battles/${battle.id}/stream`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                  participant_id: aiParticipant.id,
                  model_id: modelId,
                  problem: {
                    name: problem.name,
                    content: problem.content,
                    input_format: problem.input_format,
                    output_format: problem.output_format,
                    samples: problem.samples,
                  },
                }),
              },
            )

            if (!response.ok || !response.body) {
              throw new Error(`AI code generation failed for ${modelId}`)
            }

            const reader = response.body.getReader()
            const decoder = new TextDecoder()
            let rawGeneratedText = ""

            while (true) {
              const { done, value } = await reader.read()
              if (done) break
              const chunk = decoder.decode(value, { stream: true })
              rawGeneratedText += chunk
              setAiGenerations((prev) =>
                prev.map((g) =>
                  g.modelId === modelId
                    ? {
                        ...g,
                        rawText: rawGeneratedText,
                        code: extractPythonCodeFromText(rawGeneratedText),
                      }
                    : g,
                ),
              )
            }

            const finalChunk = decoder.decode()
            rawGeneratedText += finalChunk
            const sourceCode =
              extractPythonCodeFromText(rawGeneratedText).trim() ||
              rawGeneratedText.trim()

            setAiGenerations((prev) =>
              prev.map((g) =>
                g.modelId === modelId
                  ? {
                      ...g,
                      rawText: rawGeneratedText,
                      code: extractPythonCodeFromText(rawGeneratedText),
                    }
                  : g,
              ),
            )

            // Start evaluation for this model
            setAiGenerations((prev) =>
              prev.map((g) =>
                g.modelId === modelId
                  ? { ...g, isStreaming: false, isEvaluating: true }
                  : g,
              ),
            )

            const evaluatedAiParticipant =
              await AiBattlesService.saveGeneratedCode({
                battleId: battle.id,
                requestBody: {
                  participant_id: aiParticipant.id,
                  model_id: modelId,
                  source_code: sourceCode,
                  finish_reason: "stop",
                },
              })

            if (!evaluatedAiParticipant?.submission_id) {
              throw new Error("AI submission was not evaluated")
            }

            const aiSubmission = await SubmissionsService.readSubmission({
              submissionId: evaluatedAiParticipant.submission_id,
            })

            setAiGenerations((prev) =>
              prev.map((g) =>
                g.modelId === modelId
                  ? { ...g, isEvaluating: false, submission: aiSubmission }
                  : g,
              ),
            )
          } catch (error) {
            console.error(`AI battle failed for ${modelId}:`, error)
            setAiGenerations((prev) =>
              prev.map((g) =>
                g.modelId === modelId
                  ? {
                      ...g,
                      isStreaming: false,
                      isEvaluating: false,
                      error:
                        error instanceof Error
                          ? error.message
                          : "AI code generation failed",
                    }
                  : g,
              ),
            )
          }
        }),
      )

      queryClient.invalidateQueries({ queryKey: ["ai-battle", battle.id] })

      // Generate AI review comment
      const finalUserSub = comparisonUserSubmission || userSub
      const ai1Sub = aiGenerations[0]?.submission
      const ai2Sub = aiGenerations[1]?.submission

      const metricsStr = `
- 判定: 自分=${finalUserSub?.verdict}, AI 1=${ai1Sub?.verdict}, AI 2=${ai2Sub?.verdict}
- 実行時間: 自分=${finalUserSub?.total_time_ms}ms, AI 1=${ai1Sub?.total_time_ms}ms, AI 2=${ai2Sub?.total_time_ms}ms
- メモリ: 自分=${finalUserSub?.peak_memory_kb}KB, AI 1=${ai1Sub?.peak_memory_kb}KB, AI 2=${ai2Sub?.peak_memory_kb}KB
- コードサイズ: 自分=${finalUserSub?.code_bytes}B, AI 1=${ai1Sub?.code_bytes}B, AI 2=${ai2Sub?.code_bytes}B
`

      setEvalComment("")
      setIsCommentLoading(true)
      try {
        const commentResponse = await fetch(
          `/api/wa-rev/ai-battles/${battle.id}/comment`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              userCode: userSub?.source_code || "",
              ai1Code: aiGenerations[0]?.code || "",
              ai2Code: aiGenerations[1]?.code || "",
              metricsSummary: metricsStr,
            }),
          },
        )

        if (commentResponse.ok && commentResponse.body) {
          const commentReader = commentResponse.body.getReader()
          const commentDecoder = new TextDecoder()
          while (true) {
            const { done, value } = await commentReader.read()
            if (done) break
            const chunk = commentDecoder.decode(value, { stream: true })
            setEvalComment((prev) => prev + chunk)
          }
          const finalChunk = commentDecoder.decode()
          setEvalComment((prev) => prev + finalChunk)
        }
      } catch (commentErr) {
        console.error("AI review comment generation failed:", commentErr)
      } finally {
        setIsCommentLoading(false)
      }
    } catch (error) {
      console.error("AI battle failed:", error)
      // We can just log it or set a global error if needed.
    } finally {
      console.info("[WA Rev] finished")
      console.groupEnd()
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={onBack}
          className="flex items-center gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
          問題選択に戻る
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <PendingItems />
        </div>
      ) : problem ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左半分: 問題内容 */}
          <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-2 border-r border-border/50">
            <div className="border-b pb-4">
              <h2 className="text-2xl font-bold tracking-tight">
                {problem.name}
              </h2>
              <div className="mt-2 flex gap-4 text-sm">
                <span className="flex items-center gap-1 bg-muted px-2.5 py-1 rounded-md text-foreground font-medium">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  制限時間: {problem.time_limit.toLocaleString()} ms
                </span>
                <span className="flex items-center gap-1 bg-muted px-2.5 py-1 rounded-md text-foreground font-medium">
                  <Cpu className="h-4 w-4 text-muted-foreground" />
                  メモリ制限: {problem.memory_limit} GB
                </span>
              </div>
            </div>

            {/* 問題文 */}
            <div className="space-y-2">
              <h3 className="text-lg font-bold border-l-4 border-primary pl-2">
                問題文
              </h3>
              <p className="whitespace-pre-wrap text-foreground/90 leading-relaxed bg-muted/10 p-4 rounded-lg border text-sm">
                {problem.content}
              </p>
            </div>

            {/* 入力・出力フォーマット */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h3 className="text-md font-bold border-l-4 border-primary pl-2">
                  入力
                </h3>
                <p className="whitespace-pre-wrap text-xs text-foreground/90 leading-relaxed bg-muted/10 p-4 rounded-lg border min-h-[100px]">
                  {problem.input_format}
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="text-md font-bold border-l-4 border-primary pl-2">
                  出力
                </h3>
                <p className="whitespace-pre-wrap text-xs text-foreground/90 leading-relaxed bg-muted/10 p-4 rounded-lg border min-h-[100px]">
                  {problem.output_format}
                </p>
              </div>
            </div>

            {/* サンプルテストケース */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="text-lg font-bold">サンプル入出力</h3>
              <div className="space-y-4">
                {problem.samples?.map((sample, idx) => (
                  <div
                    key={idx}
                    className="p-4 border rounded-lg bg-muted/5 space-y-3"
                  >
                    <h4 className="font-semibold text-sm">
                      サンプル {idx + 1}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <span className="text-xs font-semibold text-muted-foreground block mb-1">
                          入力例 {idx + 1}
                        </span>
                        <pre className="p-3 bg-muted font-mono text-xs rounded-md overflow-x-auto border">
                          {sample.input || "(空)"}
                        </pre>
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-muted-foreground block mb-1">
                          出力例 {idx + 1}
                        </span>
                        <pre className="p-3 bg-muted font-mono text-xs rounded-md overflow-x-auto border">
                          {sample.output || "(空)"}
                        </pre>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 右半分: エディタ領域 */}
          <div className="flex flex-col border rounded-lg bg-card min-h-[480px] shadow-sm">
            {/* エディタヘッダー: 使用言語選択 */}
            <div className="flex items-center justify-between border-b px-4 py-3 bg-muted/30">
              <div className="flex items-center gap-3 w-full max-w-[280px]">
                <span className="text-xs font-semibold text-muted-foreground font-mono">
                  LANG:
                </span>
                <Select
                  value={selectedLanguage}
                  onValueChange={(val) => setSelectedLanguage(val)}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="言語を選択" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {LANGUAGES.map((lang) => (
                      <SelectItem key={lang.value} value={lang.value}>
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex h-3 w-3 rounded-full bg-destructive" />
                <span className="flex h-3 w-3 rounded-full bg-amber-500" />
                <span className="flex h-3 w-3 rounded-full bg-emerald-500" />
              </div>
            </div>

            {/* 回答コード記述エリア */}
            <div className="flex-1 flex flex-col p-4 relative">
              <div className="text-xs font-semibold text-muted-foreground mb-2 flex items-center justify-between font-mono">
                <span>SOURCE CODE</span>
              </div>
              <Textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="flex-1 font-mono text-xs leading-relaxed p-4 bg-muted/20 border-border/80 focus-visible:ring-1 focus-visible:ring-primary min-h-[300px] resize-none"
                placeholder="ここに解答コードを入力してください..."
                spellCheck={false}
                autoComplete="off"
              />
            </div>

            {/* エディタフッター */}
            <div className="border-t px-4 py-3 bg-muted/10 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs">
                {lastResults.length > 0 && (
                  <>
                    <span className="text-muted-foreground font-medium mr-1">
                      直近の判定結果:
                    </span>
                    <div className="flex items-center gap-1.5">
                      {lastResults.map((res, idx) => (
                        <span
                          key={idx}
                          className={cn(
                            "font-mono font-bold px-2 py-0.5 rounded border text-[10px] uppercase tracking-wider shadow-sm",
                            res === "AC" &&
                              "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400 dark:bg-emerald-500/5",
                            res === "WA" &&
                              "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400 dark:bg-amber-500/5",
                            res === "RE" &&
                              "bg-destructive/10 text-destructive border-destructive/20",
                            res === "TLE" &&
                              "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400 dark:bg-blue-500/5",
                            res === "MLE" &&
                              "bg-indigo-500/10 text-indigo-600 border-indigo-500/20 dark:text-indigo-400 dark:bg-indigo-500/5",
                            res === "CE" &&
                              "bg-muted text-muted-foreground border-muted-foreground/20",
                            res === null &&
                              "bg-muted/40 text-muted-foreground/40 border-muted/20",
                          )}
                          title={`テストケース ${idx + 1}`}
                        >
                          {res || "-"}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unlockStatus?.unlocked && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleOpenAiDialog}
                    disabled={acPythonSubmissions.length === 0 || isRunning}
                  >
                    AIと競う
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={handleSubmit}
                  disabled={!code || isRunning}
                >
                  提出する
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center p-6 text-muted-foreground">
          問題の読み込みに失敗しました。
        </div>
      )}

      {/* 提出結果判定モーダル */}
      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          if (!open) handleCloseDialog()
        }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton={!isRunning}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              {isRunning ? "解答を判定中..." : "判定結果"}
            </DialogTitle>
            <DialogDescription>
              {isRunning
                ? "提出コードを判定しています。"
                : "すべてのテストケースの実行が完了しました。"}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Stepper steps={steps} />
          </div>

          <DialogFooter className="flex sm:justify-between items-center gap-2">
            {isRunning ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCloseDialog}
                className="w-full sm:w-auto"
              >
                キャンセル
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleCloseDialog}
                className="w-full sm:w-auto ml-auto"
              >
                閉じる
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isAiDialogOpen}
        onOpenChange={(open) => {
          if (!isAiStreaming) setIsAiDialogOpen(open)
        }}
      >
        <DialogContent
          className="sm:max-w-[95vw] w-full max-h-[90vh] overflow-y-auto"
          showCloseButton={!isAiStreaming}
        >
          <DialogHeader>
            <DialogTitle>AIと競う</DialogTitle>
            <DialogDescription>
              AC済みのPython 3提出を選び、Claudeに解答コードを生成させます。
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <span className="text-sm font-medium">代表提出</span>
              <Select
                value={selectedSubmissionId}
                onValueChange={setSelectedSubmissionId}
                disabled={isAiStreaming}
              >
                <SelectTrigger>
                  <SelectValue placeholder="提出を選択" />
                </SelectTrigger>
                <SelectContent>
                  {acPythonSubmissions.map((submission: SubmissionPublic) => (
                    <SelectItem key={submission.id} value={submission.id}>
                      {formatSubmissionLabel(submission)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 自分 */}
              <EditorMockup
                title="自分 (Python 3)"
                value={userSourceCode}
                theme="user"
                placeholder="代表提出を選択してください..."
              />

              {/* AI 1, AI 2 */}
              {aiGenerations.map((g, idx) => (
                <EditorMockup
                  key={g.modelId}
                  title={`AI ${idx + 1} (${g.modelId})`}
                  value={g.code || g.rawText}
                  theme={idx === 0 ? "ai1" : "ai2"}
                  placeholder={
                    g.isStreaming || g.rawText
                      ? "コード生成中..."
                      : "生成開始後、ここにコードが表示されます。"
                  }
                />
              ))}
            </div>

            {(hasComparison || isEvaluating) && (
              <div className="grid gap-2 mt-4">
                <span className="text-sm font-medium">比較結果</span>
                {isEvaluating ? (
                  <div className="rounded-md border bg-muted/20 p-4 text-sm text-muted-foreground">
                    ３者のコードを評価しています...
                  </div>
                ) : hasComparison ? (
                  <div className="space-y-4">
                    <SubmissionComparison
                      userSubmission={comparisonUserSubmission}
                      aiGenerations={aiGenerations}
                    />

                    {/* AI Coach Review Comment */}
                    {(evalComment || isCommentLoading) && (
                      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2">
                        <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                          <Cpu className="h-4 w-4 animate-pulse" />
                          <span>AI Coach レビュー (Claude 4.5 Sonnet)</span>
                          {isCommentLoading && (
                            <span className="text-[10px] text-muted-foreground animate-pulse ml-auto">
                              レビュー作成中...
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-foreground/90 leading-relaxed font-sans whitespace-pre-wrap">
                          {evalComment || "レビューを生成しています..."}
                        </p>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAiDialogOpen(false)}
              disabled={isAiStreaming}
            >
              閉じる
            </Button>
            <Button
              onClick={handleStartAiBattle}
              disabled={!selectedSubmissionId || isAiStreaming}
            >
              {isAiStreaming ? "生成中..." : "生成開始"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function SubmissionComparison({
  userSubmission,
  aiGenerations,
}: {
  userSubmission: SubmissionPublic
  aiGenerations: AiGenerationState[]
}) {
  const getAiCell = (
    aiIdx: number,
    valueFn: (sub: SubmissionPublic) => string | null,
    deltaFn?: (sub: SubmissionPublic) => string,
  ) => {
    const gen = aiGenerations[aiIdx]
    if (!gen) return "-"
    if (gen.error) return "エラー"
    if (!gen.submission) return "-"

    const val = valueFn(gen.submission)
    if (val === null) return "-"

    const delta = deltaFn ? deltaFn(gen.submission) : ""
    return delta ? `${val} (${delta})` : val
  }

  const rows = [
    {
      label: "判定",
      user: userSubmission.verdict,
      ai1: getAiCell(0, (sub) => sub.verdict),
      ai2: getAiCell(1, (sub) => sub.verdict),
    },
    {
      label: "実行時間",
      user: formatNullableMetric(userSubmission.total_time_ms, "ms"),
      ai1: getAiCell(
        0,
        (sub) => formatNullableMetric(sub.total_time_ms, "ms"),
        (sub) =>
          formatDelta(
            userSubmission.total_time_ms,
            sub.total_time_ms,
            "ms",
            false,
          ),
      ),
      ai2: getAiCell(
        1,
        (sub) => formatNullableMetric(sub.total_time_ms, "ms"),
        (sub) =>
          formatDelta(
            userSubmission.total_time_ms,
            sub.total_time_ms,
            "ms",
            false,
          ),
      ),
    },
    {
      label: "メモリ",
      user: formatMemory(userSubmission.peak_memory_kb),
      ai1: getAiCell(
        0,
        (sub) => formatMemory(sub.peak_memory_kb),
        (sub) =>
          formatDelta(
            userSubmission.peak_memory_kb,
            sub.peak_memory_kb,
            "KB",
            false,
          ),
      ),
      ai2: getAiCell(
        1,
        (sub) => formatMemory(sub.peak_memory_kb),
        (sub) =>
          formatDelta(
            userSubmission.peak_memory_kb,
            sub.peak_memory_kb,
            "KB",
            false,
          ),
      ),
    },
    {
      label: "コードサイズ",
      user: formatNullableMetric(userSubmission.code_bytes, "bytes"),
      ai1: getAiCell(
        0,
        (sub) => formatNullableMetric(sub.code_bytes, "bytes"),
        (sub) =>
          formatDelta(userSubmission.code_bytes, sub.code_bytes, "B", false),
      ),
      ai2: getAiCell(
        1,
        (sub) => formatNullableMetric(sub.code_bytes, "bytes"),
        (sub) =>
          formatDelta(userSubmission.code_bytes, sub.code_bytes, "B", false),
      ),
    },
    {
      label: "有効行数",
      user: formatNullableMetric(userSubmission.effective_lines, "lines"),
      ai1: getAiCell(
        0,
        (sub) => formatNullableMetric(sub.effective_lines, "lines"),
        (sub) =>
          formatDelta(
            userSubmission.effective_lines,
            sub.effective_lines,
            "行",
            false,
          ),
      ),
      ai2: getAiCell(
        1,
        (sub) => formatNullableMetric(sub.effective_lines, "lines"),
        (sub) =>
          formatDelta(
            userSubmission.effective_lines,
            sub.effective_lines,
            "行",
            false,
          ),
      ),
    },
    {
      label: "最大ネスト",
      user: formatNullableMetric(userSubmission.max_nesting_depth, ""),
      ai1: getAiCell(
        0,
        (sub) => formatNullableMetric(sub.max_nesting_depth, ""),
        (sub) =>
          formatDelta(
            userSubmission.max_nesting_depth,
            sub.max_nesting_depth,
            "",
            false,
          ),
      ),
      ai2: getAiCell(
        1,
        (sub) => formatNullableMetric(sub.max_nesting_depth, ""),
        (sub) =>
          formatDelta(
            userSubmission.max_nesting_depth,
            sub.max_nesting_depth,
            "",
            false,
          ),
      ),
    },
  ]

  return (
    <div className="overflow-hidden rounded-md border">
      <div className="grid grid-cols-[1fr_1fr_1.5fr_1.5fr] border-b bg-muted/40 px-3 py-2 text-xs font-semibold text-muted-foreground">
        <span>指標</span>
        <span>自分</span>
        <span>AI 1</span>
        <span>AI 2</span>
      </div>
      {rows.map((row) => (
        <div
          key={row.label}
          className="grid grid-cols-[1fr_1fr_1.5fr_1.5fr] border-b px-3 py-2 text-xs last:border-b-0"
        >
          <span className="font-medium text-muted-foreground">{row.label}</span>
          <span className="font-mono">{row.user}</span>
          <span className="font-mono text-muted-foreground whitespace-pre-wrap">
            {row.ai1}
          </span>
          <span className="font-mono text-muted-foreground whitespace-pre-wrap">
            {row.ai2}
          </span>
        </div>
      ))}
    </div>
  )
}
function formatNullableMetric(value: number | null | undefined, unit: string) {
  if (value === null || value === undefined) return "-"
  return unit ? `${value}${unit}` : `${value}`
}

function formatMemory(value: number | null | undefined) {
  if (value === null || value === undefined) return "-"
  return `${(value / 1024).toFixed(1)}MB`
}

function formatDelta(
  userValue: number | null | undefined,
  aiValue: number | null | undefined,
  unit: string,
  lowerIsBetter: boolean,
) {
  if (userValue === null || userValue === undefined) return "-"
  if (aiValue === null || aiValue === undefined) return "-"

  const delta = aiValue - userValue
  if (delta === 0) return "±0"

  const sign = delta > 0 ? "+" : ""
  const suffix = unit ? unit : ""
  const marker = lowerIsBetter ? (delta < 0 ? "AI優位" : "自分優位") : ""
  return `${sign}${delta}${suffix}${marker ? ` / ${marker}` : ""}`
}

function formatSubmissionLabel(submission: SubmissionPublic) {
  const createdAt = submission.created_at
    ? new Date(submission.created_at).toLocaleString()
    : "日時不明"
  const time =
    submission.total_time_ms === null || submission.total_time_ms === undefined
      ? "-"
      : `${submission.total_time_ms}ms`
  const memory =
    submission.peak_memory_kb === null ||
    submission.peak_memory_kb === undefined
      ? "-"
      : `${(submission.peak_memory_kb / 1024).toFixed(1)}MB`

  return `${createdAt} / ${time} / ${memory}`
}

function ProblemsList({
  contest,
  onBack,
  onSelectProblem,
}: {
  contest: ContestSummaryPublic
  onBack: () => void
  onSelectProblem: (id: string) => void
}) {
  const { data: contestProblemsData, isLoading } = useQuery({
    queryKey: ["contest", contest.id, "problems"],
    queryFn: () => ContestsService.readContestProblems({ id: contest.id }),
    staleTime: 60_000,
  })

  const problemLinks: ContestProblemsPublic[] = [
    ...(contestProblemsData?.data || []),
  ].sort((a, b) => {
    const aOrder = a.order_num ?? 0
    const bOrder = b.order_num ?? 0
    return aOrder - bOrder
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={onBack}
          className="flex items-center gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
          コンテスト一覧に戻る
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold tracking-tight">{contest.title}</h2>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <PendingItems />
        </div>
      ) : problemLinks.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-card text-muted-foreground">
          このコンテストにはまだ問題が登録されていません。
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <DataTable
            columns={userProblemColumns}
            data={problemLinks}
            meta={{
              onStartProblem: onSelectProblem,
            }}
          />
        </div>
      )}
    </div>
  )
}

function ContestsContent({
  onJoinContest,
}: {
  onJoinContest: (contest: ContestSummaryPublic) => void
}) {
  const { data: contestsData } = useSuspenseQuery({
    queryKey: ["contests", "available"],
    queryFn: () => ContestsService.readAvailableContests(),
    staleTime: 5 * 60_000,
  })

  const contests = contestsData?.data ?? []
  const now = useContestBoundaryClock(contests, contestsData?.server_now)
  const ongoing = contests.filter((contest) => {
    const start = Date.parse(contest.start_at)
    const end = Date.parse(contest.end_at)

    return start <= now && now < end
  })

  if (ongoing.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-12 border rounded-lg bg-card">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Calendar className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold">
          開催中のコンテストはありません
        </h3>
        <p className="text-muted-foreground">
          新しいコンテストが開始されるまでお待ちください
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-3">
        <DataTable
          columns={ongoingOrFinishedColumns}
          data={ongoing}
          meta={{
            onJoinContest,
          }}
        />
      </div>
    </div>
  )
}

function Dashboard() {
  const [selectedContest, setSelectedContest] =
    useState<ContestSummaryPublic | null>(null)
  const [selectedProblemId, setSelectedProblemId] = useState<string | null>(
    null,
  )

  if (selectedContest && selectedProblemId) {
    return (
      <ProblemSolveView
        problemId={selectedProblemId}
        contestId={selectedContest.id}
        onBack={() => setSelectedProblemId(null)}
      />
    )
  }

  if (selectedContest) {
    return (
      <ProblemsList
        contest={selectedContest}
        onBack={() => setSelectedContest(null)}
        onSelectProblem={(id) => setSelectedProblemId(id)}
      />
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            開催中コンテスト一覧
          </h1>
        </div>
      </div>
      <Suspense fallback={<PendingItems />}>
        <ContestsContent
          onJoinContest={(contest) => setSelectedContest(contest)}
        />
      </Suspense>
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (user?.is_superuser) {
      router.replace("/admin/contests")
    }
  }, [user, router])

  if (user?.is_superuser) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return <Dashboard />
}
