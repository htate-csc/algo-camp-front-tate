import { anthropic } from "@ai-sdk/anthropic"
import { google } from "@ai-sdk/google"
import { streamText } from "ai"

export const runtime = "nodejs"

type CommentRequestBody = {
  userCode: string
  ai1Code: string
  ai2Code: string
  metricsSummary: string
}

export async function POST(request: Request) {
  const body = (await request.json()) as CommentRequestBody
  const modelId = process.env.WA_REV_CLAUDE_MODEL || "claude-sonnet-4-5"

  const model = modelId.startsWith("gemini")
    ? google(modelId)
    : anthropic(modelId)

  const prompt = `あなたは優秀な競技プログラミングコーチです。
提出された3つのコード（自分、AI 1、AI 2）と、その実行結果（実行時間、メモリ、コードサイズ等）を比較し、
3者の数値を比較しながらどのような違いや工夫があるか、「自分」に対して簡潔で教育的なアドバイス（日本語、2〜3行程度）を出力してください。

【提出コード】
■ 自分:
${body.userCode}

■ AI 1:
${body.ai1Code}

■ AI 2:
${body.ai2Code}

【結果データ】
${body.metricsSummary}

アドバイスを行う際は、必ず【結果データ】の実際の数値に矛盾しないように注意してください。理論上の計算量と実際の実行時間・メモリに差がある場合は、その理由（言語仕様のオーバーヘッド等）も踏まえて評価してください。

出力は純粋なアドバイス文のみとし、見出しやMarkdownの装飾は避け、自然な2〜3行の段落にしてください。`

  const result = streamText({
    model,
    system:
      "You are a professional competitive programming coach providing 2-3 lines of feedback in Japanese.",
    prompt,
    maxOutputTokens: 500,
  })

  return result.toTextStreamResponse()
}
