import { anthropic } from "@ai-sdk/anthropic"
import { google } from "@ai-sdk/google"
import { streamText } from "ai"
import {
  buildWaRevPrompt,
  type WaRevPromptProblem,
} from "@/lib/wa-rev/aiPrompt"

export const runtime = "nodejs"

type StreamRequestBody = {
  problem: WaRevPromptProblem
  model_id?: string
}

export async function POST(request: Request) {
  const body = (await request.json()) as StreamRequestBody
  const modelId =
    body.model_id || process.env.WA_REV_CLAUDE_MODEL || "claude-sonnet-4-5"

  const model = modelId.startsWith("gemini")
    ? google(modelId)
    : anthropic(modelId)

  const result = streamText({
    model,
    system:
      "You generate Python 3 competitive programming solutions. Output code only.",
    prompt: buildWaRevPrompt(body.problem),
    maxOutputTokens: 4096,
  })

  return result.toTextStreamResponse()
}
