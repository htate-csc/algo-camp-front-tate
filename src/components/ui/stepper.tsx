import { Check, X, Loader2, Circle, Clock, Database } from "lucide-react"
import { cn } from "@/lib/utils"

export type StepStatus = "idle" | "running" | "success" | "error"
export type JudgeResult = "AC" | "WA" | "RE" | "TLE" | "MLE" | "CE" | null

export interface StepItem {
  id: string | number
  title: string
  status: StepStatus
  result?: JudgeResult
  time?: number // in ms
  memory?: number // in KB or bytes
}

interface StepperProps {
  steps: StepItem[]
  className?: string
}

export function Stepper({ steps, className }: StepperProps) {
  return (
    <div className={cn("space-y-6", className)}>
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1
        const isActive = step.status === "running"
        const isCompleted = step.status === "success" || step.status === "error"

        return (
          <div key={step.id} className="relative flex gap-4">
            {/* Connecting line */}
            {!isLast && (
              <span
                className={cn(
                  "absolute left-4 top-8 bottom-0 w-0.5 -ml-[1px] bg-border transition-colors duration-300",
                  step.status === "success" && "bg-emerald-500",
                  step.status === "error" && "bg-destructive/50"
                )}
                aria-hidden="true"
              />
            )}

            {/* Icon Circle */}
            <div className="relative flex items-center justify-center shrink-0">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all duration-300 bg-background",
                  step.status === "idle" && "border-muted text-muted-foreground",
                  step.status === "running" && "border-primary text-primary ring-4 ring-primary/20",
                  step.status === "success" && "border-emerald-500 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400",
                  step.status === "error" && "border-destructive bg-destructive/10 text-destructive dark:bg-destructive/20"
                )}
              >
                {step.status === "idle" && <Circle className="h-3 w-3 fill-muted" />}
                {step.status === "running" && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                {step.status === "success" && <Check className="h-4 w-4" />}
                {step.status === "error" && <X className="h-4 w-4" />}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 pt-0.5 pb-2">
              <div className="flex items-center justify-between gap-2">
                <span
                  className={cn(
                    "text-sm font-semibold tracking-tight transition-colors duration-200",
                    isActive && "text-foreground font-bold",
                    isCompleted && "text-foreground/90",
                    step.status === "idle" && "text-muted-foreground"
                  )}
                >
                  {step.title}
                </span>

                {/* Badge for Judgment */}
                {step.result && (
                  <span
                    className={cn(
                      "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold font-mono tracking-wider border shadow-sm animate-in fade-in zoom-in-95 duration-200",
                      step.result === "AC" &&
                        "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400",
                      step.result === "WA" &&
                        "bg-amber-500/10 text-amber-600 border-amber-500/30 dark:text-amber-400",
                      step.result === "RE" &&
                        "bg-destructive/10 text-destructive border-destructive/30",
                      step.result === "TLE" &&
                        "bg-blue-500/10 text-blue-600 border-blue-500/30 dark:text-blue-400",
                      step.result === "MLE" &&
                        "bg-indigo-500/10 text-indigo-600 border-indigo-500/30 dark:text-indigo-400",
                      step.result === "CE" &&
                        "bg-muted text-muted-foreground border-muted-foreground/30"
                    )}
                  >
                    {step.result}
                  </span>
                )}
              </div>

              {/* Status helper text and time/memory details */}
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {step.status === "running" && (
                  <span className="animate-pulse">実行中...</span>
                )}
                {step.status === "idle" && <span>待機中</span>}
                {step.status === "success" && !step.result && (
                  <span>実行完了</span>
                )}
                
                {/* Time & Memory consumption display */}
                {isCompleted && (step.time !== undefined || step.memory !== undefined) && (
                  <div className="flex items-center gap-3 mt-0.5 text-[11px] text-muted-foreground/80 font-mono">
                    {step.time !== undefined && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3 shrink-0" />
                        {(step.time * 1000).toFixed(0)} ms
                      </span>
                    )}
                    {step.memory !== undefined && (
                      <span className="flex items-center gap-1">
                        <Database className="h-3 w-3 shrink-0" />
                        {(step.memory / 1024 / 1024).toFixed(2)} MB
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
