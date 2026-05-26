import { useCallback, useRef, useState } from "react"
import type { JudgeResult, StepItem, StepStatus } from "@/components/ui/stepper"
import { paizaClient } from "@/lib/paiza"

interface RunSubmissionParams {
  code: string
  language: string
  samples: { input: string; output: string }[]
  timeLimitMs: number // in milliseconds, e.g. 2000
  memoryLimitGb: number // in GB, e.g. 1
}

export function usePaizaRunner() {
  const [steps, setSteps] = useState<StepItem[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [overallResult, setOverallResult] = useState<JudgeResult>(null)

  // To allow cancelling or cleaning up in-flight polling if needed
  const isCancelledRef = useRef(false)

  const compareOutput = useCallback(
    (actual: string | null, expected: string): boolean => {
      if (actual === null) return false

      // Normalize lines: replace \r\n with \n, trim ends of each line, and trim outer whitespace
      const actualLines = actual
        .replace(/\r\n/g, "\n")
        .trim()
        .split("\n")
        .map((l) => l.trimEnd())
      const expectedLines = expected
        .replace(/\r\n/g, "\n")
        .trim()
        .split("\n")
        .map((l) => l.trimEnd())

      // Filter out completely empty lines at the very end
      while (
        actualLines.length > 0 &&
        actualLines[actualLines.length - 1] === ""
      ) {
        actualLines.pop()
      }
      while (
        expectedLines.length > 0 &&
        expectedLines[expectedLines.length - 1] === ""
      ) {
        expectedLines.pop()
      }

      if (actualLines.length !== expectedLines.length) return false

      for (let i = 0; i < actualLines.length; i++) {
        if (actualLines[i] !== expectedLines[i]) return false
      }

      return true
    },
    [],
  )

  const runSubmission = useCallback(
    async ({
      code,
      language,
      samples,
      timeLimitMs,
      memoryLimitGb,
    }: RunSubmissionParams) => {
      isCancelledRef.current = false
      setIsRunning(true)
      setOverallResult(null)

      // Limit to at most 3 samples to match user requirement ("problemが持つ3つのinput-output")
      const activeSamples = samples.slice(0, 3)

      // Initialize steps
      const initialSteps: StepItem[] = activeSamples.map((_, index) => ({
        id: `case-${index}`,
        title: `テストケース ${index + 1}`,
        status: "idle" as StepStatus,
      }))

      setSteps(initialSteps)

      let currentStepsState = [...initialSteps]
      let failedResult: JudgeResult = null

      // Run sequentially
      for (let i = 0; i < activeSamples.length; i++) {
        if (isCancelledRef.current) break

        const sample = activeSamples[i]

        // Set current step to running
        currentStepsState = currentStepsState.map((step, idx) =>
          idx === i ? { ...step, status: "running" as StepStatus } : step,
        )
        setSteps(currentStepsState)

        try {
          // 1. Create runner session
          const session = await paizaClient.createSession(
            code,
            language,
            sample.input,
          )

          if (session.error) {
            throw new Error(session.error)
          }

          const sessionId = session.id
          let isCompleted = false
          let retries = 0
          const maxRetries = 30 // 30 seconds max polling time

          // 2. Poll status
          while (
            !isCompleted &&
            retries < maxRetries &&
            !isCancelledRef.current
          ) {
            await new Promise((resolve) => setTimeout(resolve, 1000))

            if (isCancelledRef.current) break

            const statusRes = await paizaClient.getStatus(sessionId)
            if (statusRes.error) {
              throw new Error(statusRes.error)
            }

            if (statusRes.status === "completed") {
              isCompleted = true
            }
            retries++
          }

          if (isCancelledRef.current) break

          if (!isCompleted) {
            // Polling timeout -> TLE
            if (!failedResult) {
              failedResult = "TLE"
            }
            currentStepsState = currentStepsState.map((step, idx) =>
              idx === i
                ? {
                    ...step,
                    status: "error" as StepStatus,
                    result: "TLE" as JudgeResult,
                  }
                : step,
            )
            setSteps(currentStepsState)
            continue // Proceed to next testcase
          }

          // 3. Get Details
          const details = await paizaClient.getDetails(sessionId)

          // Determine Judgment
          let stepResult: JudgeResult = "AC"
          const timeSec =
            details.time !== null && details.time !== undefined
              ? Number(details.time)
              : 0
          const memoryBytes =
            details.memory !== null && details.memory !== undefined
              ? Number(details.memory)
              : 0
          const exitCode =
            details.exit_code !== null && details.exit_code !== undefined
              ? Number(details.exit_code)
              : null

          // Compile Error
          if (
            details.build_result === "failure" ||
            details.build_result === "error"
          ) {
            stepResult = "CE"
          }
          // Memory Limit Exceeded
          else if (
            memoryLimitGb > 0 &&
            memoryBytes > memoryLimitGb * 1024 * 1024 * 1024
          ) {
            stepResult = "MLE"
          }
          // Time Limit Exceeded
          else if (
            details.result === "timeout" ||
            (timeLimitMs > 0 && timeSec * 1000 > timeLimitMs)
          ) {
            stepResult = "TLE"
          }
          // Runtime Error
          else if (
            details.result === "failure" ||
            details.result === "error" ||
            (exitCode !== null && exitCode !== 0)
          ) {
            stepResult = "RE"
          }
          // Wrong Answer
          else if (!compareOutput(details.stdout, sample.output)) {
            stepResult = "WA"
          }

          // Update step state
          currentStepsState = currentStepsState.map((step, idx) =>
            idx === i
              ? {
                  ...step,
                  status: (stepResult === "AC"
                    ? "success"
                    : "error") as StepStatus,
                  result: stepResult,
                  time: timeSec,
                  memory: memoryBytes,
                }
              : step,
          )
          setSteps(currentStepsState)

          if (stepResult === "AC") {
            console.log(
              `Testcase ${i + 1} passed with result: AC [${(timeSec * 1000).toFixed(0)}ms / ${(memoryBytes / 1024 / 1024).toFixed(2)}MB]`,
              {
                result: details.result,
                exit_code: details.exit_code,
                stdout: details.stdout,
                stderr: details.stderr,
                time: `${(timeSec * 1000).toFixed(0)} ms`,
                memory: `${(memoryBytes / 1024 / 1024).toFixed(2)} MB`,
                build_result: details.build_result,
                build_stderr: details.build_stderr,
              },
            )
          } else {
            console.error(
              `Testcase ${i + 1} failed with result: ${stepResult} [${(timeSec * 1000).toFixed(0)}ms / ${(memoryBytes / 1024 / 1024).toFixed(2)}MB]`,
              {
                result: details.result,
                exit_code: details.exit_code,
                stdout: details.stdout,
                stderr: details.stderr,
                time: `${(timeSec * 1000).toFixed(0)} ms`,
                memory: `${(memoryBytes / 1024 / 1024).toFixed(2)} MB`,
                build_result: details.build_result,
                build_stderr: details.build_stderr,
              },
            )
            if (!failedResult) {
              failedResult = stepResult
            }
          }
        } catch (err) {
          console.error(`Error in testcase ${i + 1}:`, err)
          if (!failedResult) {
            failedResult = "RE"
          }
          currentStepsState = currentStepsState.map((step, idx) =>
            idx === i
              ? {
                  ...step,
                  status: "error" as StepStatus,
                  result: "RE" as JudgeResult,
                }
              : step,
          )
          setSteps(currentStepsState)
        }
      }

      if (!isCancelledRef.current) {
        const finalResult = failedResult || "AC"
        setOverallResult(finalResult)
        setIsRunning(false)
        return currentStepsState.map((s) => s.result || null)
      }

      setIsRunning(false)
      return null
    },
    [compareOutput],
  )

  const cancelSubmission = useCallback(() => {
    isCancelledRef.current = true
    setIsRunning(false)
  }, [])

  const resetRunner = useCallback(() => {
    setSteps([])
    setIsRunning(false)
    setOverallResult(null)
  }, [])

  return {
    steps,
    isRunning,
    overallResult,
    runSubmission,
    cancelSubmission,
    resetRunner,
  }
}
