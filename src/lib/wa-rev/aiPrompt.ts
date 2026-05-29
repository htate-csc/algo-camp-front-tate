type WaRevPromptCase = {
  input: string
  output: string
}

export type WaRevPromptProblem = {
  name: string
  content: string
  input_format: string
  output_format: string
  samples: WaRevPromptCase[]
}

export function buildWaRevPrompt(problem: WaRevPromptProblem): string {
  const cases = problem.samples
    .map(
      (sample, index) => `Case ${index + 1}
Input:
${sample.input || "(empty)"}

Expected output:
${sample.output || "(empty)"}`,
    )
    .join("\n\n")

  return `Solve the following competitive programming problem in Python 3.
Return only the complete source code. Do not include Markdown fences, explanation, or comments outside the code.

Problem name:
${problem.name}

Statement:
${problem.content}

Input format:
${problem.input_format}

Output format:
${problem.output_format}

Provided cases:
${cases}
`
}

export function extractPythonCodeFromText(text: string): string {
  const normalized = text.replace(/\r\n/g, "\n")
  const fenceMatch = normalized.match(
    /```[ \t]*(?:python|python3|py)?[^\n]*\n/i,
  )

  if (fenceMatch?.index !== undefined) {
    const codeStart = fenceMatch.index + fenceMatch[0].length
    const afterFence = normalized.slice(codeStart)
    const codeEnd = afterFence.indexOf("```")
    return (
      codeEnd === -1 ? afterFence : afterFence.slice(0, codeEnd)
    ).trimStart()
  }

  return looksLikePythonCode(normalized) ? normalized : ""
}

function looksLikePythonCode(text: string): boolean {
  const significantLines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)

  if (significantLines.length === 0) return false

  const codeLikeLines = significantLines.filter((line) =>
    /^(from\s+\S+\s+import\s+|import\s+|def\s+|class\s+|if\s+|elif\s+|else:|for\s+|while\s+|try:|except\b|finally:|with\s+|return\b|print\s*\(|[A-Za-z_][A-Za-z0-9_]*\s*=|[A-Za-z_][A-Za-z0-9_]*\s*\+=|[A-Za-z_][A-Za-z0-9_]*\s*-=|#)/.test(
      line,
    ),
  )

  return codeLikeLines.length / significantLines.length >= 0.6
}
