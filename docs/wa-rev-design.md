# WA Rev. 技術設計書

Status: Draft
Last updated: 2026-05-28

## 1. 設計方針

WA Rev. では、数値計測と LLM コメントを明確に分離する。

- judge verdict はコード実行と出力比較で決める。
- code metrics は backend の静的解析で決める。
- pytest-monitor metrics は `.pymon` SQLite DB から抽出して数値として保存する。
- LLM は、すでに検出された大きな変化について diff を読み、原因候補や確認観点を説明するだけにする。

競プロアプリ側では、FastAPI backend が提出結果、AC count、judge、static analysis、evaluation の source of truth になる。現在の frontend 直接 Paiza runner はプロトタイプとしては有効だが、AC 回数、AI 対決の解放条件、評価結果の根拠には使わない。

AI 生成 streaming は MVP では Next.js Route Handler + Vercel AI SDK に寄せる。これは frontend 実装速度を優先するための判断であり、生成結果の保存と評価の正は FastAPI backend に残す。

GitHub Actions Reviewer 側は、最初から厳密な regression gate にしない。初期版は、性能値と環境差を見やすく表示する観測・レビュー支援ツールとして作る。

## 2. 現在の構成

### 2.1 frontend

関連ファイル:

- `src/app/(dashboard)/page.tsx`
- `src/hooks/usePaizaRunner.ts`
- `src/lib/paiza.ts`
- `src/app/providers.tsx`
- `src/client/*`
- `next.config.ts`

現在の動作:

- 通常ユーザーは `ContestsService.readAvailableContests` で開催中コンテストを取得する。
- コンテスト内問題は `ContestsService.readContestProblems` で取得する。
- 問題詳細は `ProblemsService.readProblem` で取得する。
- 提出コードは frontend から Paiza.io に直接送られる。
- Paiza.io は Next.js rewrite の `/api-paiza` 経由で呼ばれる。
- stdout と expected output の比較は frontend hook 内で行われる。
- 判定結果は modal の stepper で表示される。
- 提出結果は DB に保存されない。

現在の単位まわりの注意:

- `Problem.time_limit` は画面上 ms として扱われている。
- `Problem.memory_limit` は画面上 GB として扱われている。
- Paiza `details.time` は seconds。
- Paiza `details.memory` は bytes。
- `StepItem.time` のコメントは ms だが、実際には seconds を入れて UI 側で `* 1000` している。

### 2.2 backend

関連ファイル:

- `../coding-contest-backend/app/models.py`
- `../coding-contest-backend/app/api/routes/problems.py`
- `../coding-contest-backend/app/api/routes/contests.py`
- `../coding-contest-backend/app/api/routes/contest_problems.py`
- `../coding-contest-backend/app/api/deps.py`
- `../coding-contest-backend/app/core/config.py`
- `../coding-contest-backend/app/core/db.py`
- `../coding-contest-backend/app/alembic/versions/*`

現在の動作:

- FastAPI app が `/api/v1` 配下に API を出している。
- bearer token 認証。
- SQLModel で PostgreSQL に永続化している。
- Alembic migration を利用している。
- `User` は `login_id`, `hashed_password`, `is_superuser`, `full_name`, `created_at` を持つ。
- `Contest` は `title`, `start_at`, `end_at`, `is_deleted`, timestamps, problem links を持つ。
- `Problem` は `name`, `time_limit`, `memory_limit`, `content`, `input_format`, `output_format`, `samples` を持つ。
- `ContestProblems` は contest と problem を `order_num` 付きで紐付ける。
- 通常ユーザーは開催中 contest と、その contest に紐づく problem のみ取得できる。

WA Rev. に対する不足:

- 提出履歴 model がない。
- case 別 result model がない。
- code analysis model がない。
- AI battle / evaluation model がない。
- backend 所有の Paiza client / judge abstraction がない。
- hidden judge case がない。
- 一部 backend test が現行 `login_id` model とズレている。

## 3. 目標アーキテクチャ

```text
Browser
  |
  | generated OpenAPI client
  v
FastAPI backend
  |
  | SQLModel / Alembic
  v
Supabase Postgres

FastAPI backend
  |
  | JudgeGateway
  v
Paiza.io or future judge backend

Browser
  |
  | fetch /api/wa-rev/ai-battles/:battleId/stream
  v
Next.js Route Handler
  |
  | Vercel AI SDK streamText
  v
Claude via AI SDK provider or AI Gateway

Next.js Route Handler
  |
  | generated code save request
  v
FastAPI backend

GitHub Actions reviewer
  |
  | pytest-monitor .pymon
  v
Extractor script
  |
  | ingest API or direct DB connection
  v
Supabase Postgres
```

Supabase は PostgreSQL として扱う。既存 backend の SQLModel + Alembic を維持し、アプリ本体に別 ORM や `supabase-py` を必須導入しない。

AI streaming の採用根拠:

- Vercel AI SDK は React / Next.js / Node.js などで AI application を構築するための TypeScript toolkit とされている。
- AI SDK Core は text generation や structured object などを統一 API で扱う。
- AI SDK は Anthropic を含む複数 provider をサポートする。
- `streamText` は language model から text generation を stream する API で、`textStream` は generated text deltas の AsyncIterable/ReadableStream として扱える。
- Next.js App Router の公式例では、Route Handler で `streamText` を呼び、streamed response を client に返す導線が示されている。

参照:

- Vercel AI SDK introduction: https://ai-sdk.dev/docs/introduction
- `streamText` reference: https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text
- Next.js App Router guide: https://ai-sdk.dev/docs/getting-started/nextjs-app-router

## 4. backend モジュール構成

追加推奨 module:

```text
app/
  api/routes/submissions.py
  api/routes/ai_battles.py
  api/routes/evaluations.py
  api/routes/perf_reviews.py
  services/judge.py
  services/paiza.py
  services/code_analysis.py
  services/evaluation.py
  services/perf_ingest.py
```

責務:

- `submissions.py`: ユーザー提出、提出一覧、提出詳細、unlock status。
- `ai_battles.py`: AI 対決作成、生成状態、judge 開始、対決詳細。
- `evaluations.py`: 評価結果取得。
- `perf_reviews.py`: GitHub Actions Reviewer 用 ingest / 比較 API。
- `judge.py`: judge request/response の共通 model、verdict 判定、case orchestration。
- `paiza.py`: Paiza.io client、polling、timeout、response normalization。
- `code_analysis.py`: Python AST 解析。
- `evaluation.py`: deterministic な比較 summary 作成。
- `perf_ingest.py`: pytest-monitor payload validation と保存。

AI provider 呼び出しは MVP では frontend repository の Next.js Route Handler に置く。そのため FastAPI backend に `ai_generation.py` は必須ではない。ただし、prompt 作成に必要な problem 情報取得、battle status 管理、generated code 保存 API は FastAPI 側が持つ。

Next.js 側の追加推奨 module:

```text
src/app/api/wa-rev/ai-battles/[battleId]/stream/route.ts
src/lib/wa-rev/aiPrompt.ts
src/lib/wa-rev/aiModels.ts
src/hooks/useAIBattleStream.ts
```

責務:

- `route.ts`: Vercel AI SDK `streamText` を呼び、text stream を browser に返す。
- `aiPrompt.ts`: FastAPI から取得した problem/battle 情報を prompt に変換する。
- `aiModels.ts`: MVP で許可する Claude model id を定義する。
- `useAIBattleStream.ts`: stream response を読み、code pane に反映する。

## 5. データモデル

### 5.1 Submission

目的:

- ユーザー提出と AI 提出を同じ構造で保存する。
- AC count の根拠にする。
- 評価画面で利用する実行結果と静的解析結果を保存する。

推奨 model:

```python
class Submission(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID | None = Field(default=None, foreign_key="user.id", index=True)
    problem_id: uuid.UUID = Field(foreign_key="problem.id", index=True)
    contest_id: uuid.UUID | None = Field(default=None, foreign_key="contest.id", index=True)
    participant_type: str = Field(index=True)  # "user" | "ai"
    ai_model: str | None = Field(default=None, max_length=255)
    language: str = Field(max_length=50)
    source_code: str
    verdict: str = Field(max_length=10, index=True)
    total_time_ms: int | None = None
    peak_memory_kb: int | None = None
    code_bytes: int | None = None
    physical_lines: int | None = None
    effective_lines: int | None = None
    max_nesting_depth: int | None = None
    analysis_error: str | None = None
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),
    )
```

設計メモ:

- `participant_type` で user / ai を分ける。
- AI 提出では `user_id` は null でもよい。ただし battle owner は `AIBattle.user_id` で持つ。
- source code は機微情報なので、他ユーザーに公開しない。
- Paiza 由来の単位は保存前に正規化する。

### 5.2 SubmissionCaseResult

目的:

- 各判定ケースの結果を保存する。
- UI の stepper / case summary に使う。

推奨 model:

```python
class SubmissionCaseResult(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    submission_id: uuid.UUID = Field(foreign_key="submission.id", index=True)
    case_index: int
    verdict: str = Field(max_length=10)
    time_ms: int | None = None
    memory_kb: int | None = None
    stdout_preview: str | None = None
    stderr_preview: str | None = None
    build_stderr_preview: str | None = None
    exit_code: int | None = None
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),
    )
```

出力保存方針:

- stdout/stderr/build stderr は preview として保存する。
- まずは 4 KB 程度に truncate する。
- full output が必要になったら別 storage を検討する。

### 5.3 ProblemJudgeCase

MVP では既存 `Problem.samples` を判定ケースとして使える。ただし、競プロとしての正確性を上げるには sample と hidden を分ける必要がある。

将来 model:

```python
class ProblemJudgeCase(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    problem_id: uuid.UUID = Field(foreign_key="problem.id", index=True)
    input: str
    output: str
    is_sample: bool = Field(default=False, index=True)
    order_num: int = Field(default=0)
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),
    )
```

移行方針:

- Phase 1 では `Problem.samples` を `JudgeCaseInput` に変換して使う。
- Phase 7 で `ProblemJudgeCase` を追加する。
- その時点で `Problem.samples` は表示用 sample、`ProblemJudgeCase` は judge 用に分離する。

### 5.4 AIBattle

目的:

- 1つの AI 対決セッションを表す。
- user 代表提出と AI 提出群を束ねる。

推奨 model:

```python
class AIBattle(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    problem_id: uuid.UUID = Field(foreign_key="problem.id", index=True)
    contest_id: uuid.UUID | None = Field(default=None, foreign_key="contest.id", index=True)
    user_submission_id: uuid.UUID = Field(foreign_key="submission.id")
    status: str = Field(max_length=30, index=True)
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),
    )
    updated_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),
        sa_column_kwargs={"onupdate": get_datetime_utc},
    )
```

status:

- `pending`
- `generating`
- `judging`
- `evaluated`
- `failed`

### 5.5 AIBattleParticipant

目的:

- battle 内の user / AI participant を順序付きで管理する。
- 将来の3モデル対応に備える。

推奨 model:

```python
class AIBattleParticipant(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    battle_id: uuid.UUID = Field(foreign_key="aibattle.id", index=True)
    participant_type: str = Field(max_length=20)  # "user" | "ai"
    display_name: str = Field(max_length=255)
    model_id: str | None = Field(default=None, max_length=255)
    submission_id: uuid.UUID | None = Field(default=None, foreign_key="submission.id")
    generation_status: str | None = Field(default=None, max_length=30)
    generation_error: str | None = None
    order_num: int = Field(default=0)
```

### 5.6 Evaluation

目的:

- 評価画面に出す比較 snapshot を保存する。
- 後から評価ロジックが変わっても、過去 battle の表示が変わらないようにする。

推奨 model:

```python
class Evaluation(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    battle_id: uuid.UUID = Field(foreign_key="aibattle.id", index=True)
    summary: str
    metrics_json: dict = Field(sa_type=JSON)
    llm_model: str | None = Field(default=None, max_length=255)
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),
    )
```

`metrics_json` 例:

```json
{
  "participants": [
    {
      "name": "User",
      "type": "user",
      "verdict": "AC",
      "total_time_ms": 830,
      "peak_memory_kb": 28700,
      "code_bytes": 1410,
      "effective_lines": 58,
      "max_nesting_depth": 4
    },
    {
      "name": "AI model",
      "type": "ai",
      "verdict": "AC",
      "total_time_ms": 420,
      "peak_memory_kb": 23100,
      "code_bytes": 760,
      "effective_lines": 31,
      "max_nesting_depth": 2
    }
  ]
}
```

## 6. API 設計

### 6.1 Submission API

追加 endpoint:

```text
POST /api/v1/problems/{problem_id}/submissions
GET  /api/v1/problems/{problem_id}/submissions/me
GET  /api/v1/submissions/{submission_id}
GET  /api/v1/problems/{problem_id}/unlock-status
```

`POST /problems/{problem_id}/submissions` request:

```json
{
  "contest_id": "uuid",
  "language": "python3",
  "source_code": "print(input())"
}
```

response:

```json
{
  "id": "uuid",
  "verdict": "AC",
  "total_time_ms": 120,
  "peak_memory_kb": 24576,
  "code_bytes": 19,
  "physical_lines": 1,
  "effective_lines": 1,
  "max_nesting_depth": 0,
  "analysis_error": null,
  "case_results": []
}
```

access rule:

- 通常ユーザーは開催中 contest でアクセス可能な problem にだけ提出できる。
- 通常ユーザーは自分の submission だけ読める。
- superuser は全 submission を読める。
- unlock status は現在ユーザーの AC count に基づく。

### 6.2 AI Battle API

FastAPI backend 追加 endpoint:

```text
POST /api/v1/problems/{problem_id}/ai-battles
GET  /api/v1/ai-battles/{battle_id}
POST /api/v1/ai-battles/{battle_id}/generated-code
POST /api/v1/ai-battles/{battle_id}/judge
GET  /api/v1/ai-battles/{battle_id}/evaluation
```

Next.js Route Handler 追加 endpoint:

```text
POST /api/wa-rev/ai-battles/{battle_id}/stream
```

MVP では AI 生成 streaming は Next.js Route Handler が担当する。FastAPI backend は battle 作成、unlock 検証、generated code 保存、judge、static analysis、evaluation を担当する。

request:

```json
{
  "contest_id": "uuid",
  "user_submission_id": "uuid",
  "models": ["model-a"]
}
```

validation:

- `user_submission_id` が現在ユーザーの提出である。
- `user_submission_id` が対象 problem の提出である。
- 代表提出の verdict が `AC` である。
- 現在ユーザーが対象 problem で AC 3回以上を達成している。
- MVP では `models.length == 1`。
- 将来は `1 <= models.length <= 3`。

`POST /ai-battles/{battle_id}/generated-code` は Next.js Route Handler から呼ばれる保存 endpoint とする。

request:

```json
{
  "participant_id": "uuid",
  "model_id": "claude-sonnet-4-5",
  "source_code": "import sys\n...",
  "finish_reason": "stop",
  "usage": {}
}
```

validation:

- battle が現在ユーザーのもの、または route-to-backend 用 token が妥当である。
- participant が battle に属している。
- battle status が generated code を受け取れる状態である。
- `source_code` が空ではない。

### 6.3 Performance Reviewer API

本番推奨:

```text
POST /api/v1/perf-runs/ingest
GET  /api/v1/perf-runs
GET  /api/v1/perf-runs/{run_id}
GET  /api/v1/perf-runs/{run_id}/comparison
```

`POST /perf-runs/ingest` は browser 用ではなく GitHub Actions 用。

認証:

- 通常 user JWT ではなく ingest token または GitHub OIDC を使う。
- Supabase service role key を browser に出さない。
- fork PR では secrets が使えない前提で workflow を設計する。

## 7. Judge 設計

### 7.1 JudgeGateway

provider 非依存の interface を用意する。

```python
class JudgeCaseInput(SQLModel):
    input: str
    expected_output: str

class JudgeRequest(SQLModel):
    language: str
    source_code: str
    time_limit_ms: int
    memory_limit_kb: int
    cases: list[JudgeCaseInput]

class JudgeCaseOutput(SQLModel):
    verdict: str
    time_ms: int | None
    memory_kb: int | None
    stdout: str | None
    stderr: str | None
    build_stderr: str | None
    exit_code: int | None

class JudgeOutput(SQLModel):
    verdict: str
    total_time_ms: int | None
    peak_memory_kb: int | None
    cases: list[JudgeCaseOutput]
```

最初の実装は Paiza.io wrapper でよい。将来 Judge0、自前 sandbox、container runner に差し替えられるように、route 層から Paiza API を直接呼ばない。

### 7.2 verdict 判定順

case verdict priority:

1. `CE`: build failure / build error。
2. `MLE`: memory limit exceeded。
3. `TLE`: timeout または time limit exceeded。
4. `RE`: runtime failure または non-zero exit。
5. `WA`: stdout mismatch。
6. `AC`: 上記に該当しない。

overall verdict:

- case 順に見て最初の非 AC verdict。
- 全 case AC の場合のみ `AC`。

### 7.3 stdout 比較

比較 rule:

- `\r\n` を `\n` に正規化。
- 前後の余分な空白を処理する。
- 各行末の whitespace は無視。
- 末尾の空行は無視。
- 行内 whitespace の違いは無視しない。

現在の `usePaizaRunner.compareOutput` に近い挙動を backend に移植する。

### 7.4 Paiza client

Paiza API:

- `POST /runners/create.json`
- `GET /runners/get_status.json`
- `GET /runners/get_details.json`

backend 実装:

- `httpx` を使う。
- polling interval と max wait を明示する。
- Paiza error を judge failure として扱い、例外で request 全体を落としすぎない。
- source code や full input/output を log に出さない。
- response をすぐに正規化する。

単位変換:

```text
Paiza time seconds -> ms
Paiza memory bytes -> KB
Problem.time_limit ms -> ms
Problem.memory_limit GB -> KB
```

## 8. Python 静的解析

### 8.1 output

```python
class CodeAnalysisResult(SQLModel):
    language: str
    code_bytes: int
    physical_lines: int
    effective_lines: int
    max_nesting_depth: int | None
    parse_error: str | None
```

### 8.2 line count

MVP algorithm:

- `source.splitlines()` で physical lines を数える。
- `line.strip() != ""` の行を候補にする。
- `line.strip().startswith("#")` の行は effective lines から除外する。

これは厳密な LOC ではない。比較画面に出す説明可能な簡易指標として扱う。

### 8.3 nesting depth

Python `ast.parse` を使う。

depth を増やす node:

- `If`
- `For`
- `AsyncFor`
- `While`
- `With`
- `AsyncWith`
- `Try`
- `ExceptHandler`
- `FunctionDef`
- `AsyncFunctionDef`
- `ClassDef`
- `Match`

syntax error の場合:

- request 全体を失敗させない。
- `parse_error` に error message を入れる。
- `max_nesting_depth` は null にする。

## 9. AI 生成設計

### 9.1 採用技術

MVP の AI 生成 streaming は Vercel AI SDK を採用する。

採用理由:

- 現在の frontend は Next.js であり、AI SDK は Next.js / React / Node.js 向けに使いやすい。
- `streamText` は text generation を stream でき、コード生成表示と相性がよい。
- `textStream` は generated text deltas の AsyncIterable/ReadableStream として扱えるため、chat UI ではなく code pane への逐次追加に使いやすい。
- Next.js App Router の公式 guide では、Route Handler から `streamText` の result を streamed response として返す例が示されている。
- 将来 provider を増やす場合も AI SDK 側の provider abstraction を使える。

MVP provider:

- Claude に限定する。
- 実装は `@ai-sdk/anthropic` か Vercel AI Gateway 経由の Anthropic model を使う。
- model id は設定値化する。

参照:

- AI SDK introduction: https://ai-sdk.dev/docs/introduction
- `streamText` reference: https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text
- Next.js App Router guide: https://ai-sdk.dev/docs/getting-started/nextjs-app-router
- Anthropic provider: https://ai-sdk.dev/providers/ai-sdk-providers/anthropic

### 9.2 prompt contract

prompt に含める情報:

- problem name。
- problem statement。
- input format。
- output format。
- 判定ケース。
- required language: Python3。
- 「コードのみを出力する」制約。

保存する情報:

- model id。
- prompt version。
- generated source code。
- generation status。
- generation error。

### 9.3 streaming flow

MVP flow:

```text
Browser
  -> FastAPI: POST /api/v1/problems/{problem_id}/ai-battles
  -> FastAPI: unlock 検証、battle/participant 作成
  -> Browser: POST /api/wa-rev/ai-battles/{battle_id}/stream
  -> Next.js Route Handler: FastAPI から battle/problem context を取得
  -> Next.js Route Handler: streamText(...)
  -> Browser: generated text delta を code pane に表示
  -> Next.js Route Handler: onFinish で FastAPI に generated code 保存
  -> FastAPI: AI Submission 作成、judge、static analysis、evaluation 作成
  -> Browser: evaluation を取得
```

Next.js Route Handler の責務:

- Vercel AI SDK `streamText` を呼ぶ。
- text stream を browser に返す。
- 生成 text を最後まで保持し、`onFinish` または stream 完了後に FastAPI へ保存する。
- provider API key を browser に出さない。

FastAPI backend の責務:

- unlock 検証。
- battle status 管理。
- prompt に必要な problem context の提供。
- generated code 保存。
- judge。
- static analysis。
- evaluation。

### 9.4 Route Handler 実装例

概念例:

```ts
import { anthropic } from "@ai-sdk/anthropic"
import { streamText } from "ai"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ battleId: string }> },
) {
  const { battleId } = await params
  const token = request.headers.get("Authorization")

  const context = await fetchBattleContext({ battleId, token })

  const result = streamText({
    model: anthropic(process.env.WA_REV_CLAUDE_MODEL ?? "claude-sonnet-4-5"),
    system: "You generate Python 3 competitive programming solutions. Output code only.",
    prompt: buildWaRevPrompt(context),
    onFinish: async ({ text, finishReason, usage }) => {
      await saveGeneratedCode({
        battleId,
        token,
        sourceCode: text,
        finishReason,
        usage,
      })
    },
  })

  return result.toTextStreamResponse()
}
```

設計上の注意:

- WA Rev. は chat ではなく code streaming なので、まずは `toTextStreamResponse()` を使う。
- `toUIMessageStreamResponse()` は chat/message UI と相性がよいが、MVP のコード生成 pane には text stream の方が単純。
- `onFinish` が失敗した場合、FastAPI の battle status を `failed` に更新する fallback を用意する。
- stream 中断時に generated code が保存されない可能性を UI に表示する。
- Next.js Route Handler は unlock 判定や judge を行わない。

## 10. Evaluation 設計

Evaluation は deterministic metrics を snapshot として保存する。

生成 input:

- battle。
- user submission。
- AI submissions。
- submission case results。
- static analysis results。

生成 output:

- participant 比較 JSON。
- short summary。
- optional LLM model。

summary は最初は template でよい。

例:

```text
AI の提出は provided cases 上では実行時間とコード量が小さいです。ユーザー提出はネストが深いため、入力サイズが大きいケースではループ構造を確認する価値があります。
```

禁止:

- LLM に verdict や数値を決めさせる。
- LLM の文章だけを評価の source of truth にする。

## 11. frontend 設計

### 11.1 component 分割

現在の `src/app/(dashboard)/page.tsx` は contest list、problem list、problem solve、submission modal をまとめて持っている。WA Rev. 追加前に分割した方がよい。

推奨 component:

```text
src/components/Contest/UserContestList.tsx
src/components/Contest/UserProblemList.tsx
src/components/Problem/ProblemStatement.tsx
src/components/Problem/CodeEditorPanel.tsx
src/components/Submission/SubmissionResultDialog.tsx
src/components/WaRev/UnlockStatus.tsx
src/components/WaRev/AIBattleSetup.tsx
src/components/WaRev/AIBattleStream.tsx
src/components/WaRev/EvaluationPanel.tsx
```

### 11.2 submission flow

現在:

```text
ProblemSolveView -> usePaizaRunner -> paizaClient -> /api-paiza
```

変更後:

```text
ProblemSolveView
  -> SubmissionsService.createSubmission
  -> backend judge service
  -> SubmissionPublic response
```

`usePaizaRunner` は次のどちらかにする。

- backend submission API 用 hook に置き換える。
- `useSubmissionRunner` として作り直す。

### 11.3 AI streaming flow

追加 dependency:

```bash
npm install ai @ai-sdk/anthropic
```

環境変数:

```text
ANTHROPIC_API_KEY=...
WA_REV_CLAUDE_MODEL=claude-sonnet-4-5
```

frontend flow:

```text
AIBattleSetup
  -> FastAPI: create battle
  -> Next.js Route Handler: stream AI code
  -> AIBattleStream: code delta を表示
  -> FastAPI: evaluation polling/fetch
  -> EvaluationPanel
```

`useAIBattleStream` の責務:

- `fetch("/api/wa-rev/ai-battles/{battleId}/stream")` を呼ぶ。
- response body の reader から text chunk を読む。
- code pane state に append する。
- stream complete 後に evaluation query を invalidate / refetch する。
- stream error を UI に出す。

### 11.4 editor

MVP:

- textarea 継続でよい。

次段階:

- CodeMirror または Monaco を導入する。
- editor theme は状態表現として控えめに使う。
- 判定結果、AI 生成中、評価画面などの状態を theme だけに依存させない。

### 11.5 evaluation UI

表示方針:

- 比較表。
- horizontal metric bars。
- case verdict badges。
- short summary。
- participant ごとの code viewer。

主要指標:

- verdict。
- total time。
- peak memory。
- code bytes。
- effective lines。
- max nesting depth。

レイアウト:

- ツール画面として情報密度を優先する。
- 大きな hero や装飾カードを避ける。
- UI の世界観は色、font、terminal/code tone で表現する。

## 12. Reviewer 用 Supabase スキーマ

Reviewer 用 data は同じ Supabase project 内でよい。ただし、可能なら `perf` schema などで app 本体 table と分ける。

### 12.1 perf_repositories

```text
id uuid pk
provider text
owner text
name text
default_branch text
created_at timestamptz
```

unique:

```text
(provider, owner, name)
```

### 12.2 perf_runs

```text
id uuid pk
repository_id uuid fk
commit_sha text
branch text
base_sha text null
pull_request_number int null
github_run_id text
github_attempt int
run_type text
pytest_db_artifact_url text null
created_at timestamptz
```

`run_type`:

- `push`
- `pull_request`
- `base`
- `head`
- `manual`

### 12.3 perf_execution_contexts

```text
id uuid pk
run_id uuid fk
env_hash text
cpu_count int
cpu_frequency_mhz int
cpu_vendor text
ram_total_mb int
machine_node text
machine_type text
machine_arch text
system_info text
python_info text
```

### 12.4 perf_metrics

```text
id uuid pk
run_id uuid fk
session_hash text
env_hash text
item_start_time timestamptz null
item_path text
item text
item_variant text
item_fs_loc text
kind text
component text null
total_time_sec double precision
user_time_sec double precision
kernel_time_sec double precision
cpu_usage double precision
mem_usage_mb double precision
```

lookup index:

```text
(item_fs_loc, item_variant, kind)
```

### 12.5 perf_review_comments

```text
id uuid pk
run_id uuid fk
metric_id uuid fk null
severity text
body text
model text null
created_at timestamptz
```

## 13. pytest-monitor 抽出設計

### 13.1 実行 command

例:

```bash
pytest tests/perf \
  --db .wa-rev/current.pymon \
  --restrict-scope-to function \
  --description "github-actions:${GITHUB_RUN_ID}" \
  --tag repo="${GITHUB_REPOSITORY}" \
  --tag sha="${GITHUB_SHA}"
```

メモ:

- pytest-monitor は install されていれば pytest 実行時に有効になる。
- function scope に絞ると比較が単純になる。
- GitHub Actions は pytest-monitor の自動 CI metadata 対応としては明記されていないため、`--description` と `--tag` を手動で付ける。

### 13.2 SQLite query

metrics:

```sql
SELECT
  SESSION_H,
  ENV_H,
  ITEM_START_TIME,
  ITEM_PATH,
  ITEM,
  ITEM_VARIANT,
  ITEM_FS_LOC,
  KIND,
  COMPONENT,
  TOTAL_TIME,
  USER_TIME,
  KERNEL_TIME,
  CPU_USAGE,
  MEM_USAGE
FROM TEST_METRICS
WHERE KIND = 'function';
```

execution context:

```sql
SELECT
  ENV_H,
  CPU_COUNT,
  CPU_FREQUENCY_MHZ,
  CPU_VENDOR,
  RAM_TOTAL_MB,
  MACHINE_NODE,
  MACHINE_TYPE,
  MACHINE_ARCH,
  SYSTEM_INFO,
  PYTHON_INFO
FROM EXECUTION_CONTEXTS;
```

session:

```sql
SELECT
  SESSION_H,
  RUN_DATE,
  SCM_ID,
  RUN_DESCRIPTION
FROM TEST_SESSIONS;
```

## 14. Reviewer 比較設計

比較方針:

- strict gate ではなく report。
- repository ごとに設定可能。
- 初期版では「最新 main run」と「今回 run」の比較でよい。
- より高信頼にしたい場合は同じ workflow 内で base と head を両方測る。

matching key:

```text
item_fs_loc + item_variant + kind
```

report に出す項目:

- test name。
- previous time。
- current time。
- time delta。
- previous memory。
- current memory。
- memory delta。
- execution context。
- optional LLM comment。

environment handling:

- `ENV_H` が同じなら比較 confidence は高め。
- `ENV_H` が違うなら「環境差あり」と明示する。
- `CPU_COUNT`, `CPU_FREQUENCY_MHZ`, `RAM_TOTAL_MB`, `PYTHON_INFO`, `SYSTEM_INFO` を表に出す。

## 15. LLM コメント設計

LLM 呼び出しは optional で、notable change のみに限定する。

入力 payload:

```json
{
  "test": {
    "name": "test_solve_large_case",
    "file": "tests/test_solver.py"
  },
  "metrics": {
    "previous": {
      "total_time_sec": 0.82,
      "mem_usage_mb": 72.1
    },
    "current": {
      "total_time_sec": 1.24,
      "mem_usage_mb": 118.4
    }
  },
  "execution_context": {
    "same_env_hash": true,
    "previous": {},
    "current": {}
  },
  "changed_files": [
    "src/solver.py"
  ],
  "diff": "..."
}
```

出力 format:

```json
{
  "summary": "test_solve_large_case の実行時間とメモリ使用量が増えています。",
  "likely_cause": "差分では集計前に中間リストを作る処理が追加されており、大きな入力でメモリ使用量が増える可能性があります。",
  "suggestion": "必要であれば iterator 化または逐次集計に戻せるか確認してください。",
  "confidence": "medium"
}
```

prompt rule:

- 中立的なレビュー口調。
- 短く書く。
- 不確実性を明示する。
- diff から読めない原因は書かない。
- 数値表を丸ごと繰り返さない。
- WA Rev. 風の演出はしない。

## 16. GitHub Actions ワークフロー

MVP outline:

```yaml
name: WA Rev Reviewer

on:
  pull_request:
  push:
    branches:
      - main

jobs:
  perf:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"

      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install pytest-monitor

      - name: Run monitored tests
        run: |
          mkdir -p .wa-rev
          pytest tests/perf \
            --db .wa-rev/current.pymon \
            --restrict-scope-to function \
            --description "github-actions:${GITHUB_RUN_ID}" \
            --tag repo="${GITHUB_REPOSITORY}" \
            --tag sha="${GITHUB_SHA}"

      - name: Upload metrics
        run: |
          python scripts/wa_rev_upload.py .wa-rev/current.pymon

      - name: Build report
        run: |
          python scripts/wa_rev_report.py > .wa-rev/report.md
```

security:

- public repo の fork PR では secrets が渡らない前提で設計する。
- `pull_request_target` は、untrusted code を checkout して実行すると危険。
- secrets を使う job では untrusted head code を実行しない。
- 初期版は trusted branch / internal repo で動かす。

## 17. ingest 経路

### 17.1 backend ingest 推奨

```text
GitHub Actions
  -> extracted JSON
  -> POST /api/v1/perf-runs/ingest
  -> FastAPI validation
  -> Supabase Postgres
```

利点:

- DB credential を CI に出さずに済む。
- payload validation を backend に集約できる。
- repository ごとの認可を backend で管理できる。

### 17.2 direct Supabase write

```text
GitHub Actions
  -> extracted JSON
  -> Supabase REST or Postgres
```

利点:

- 実装が早い。

欠点:

- CI secrets に DB write 権限を置く必要がある。
- payload validation が分散する。
- 複数 repo 展開時の管理が重くなる。

推奨:

- 検証段階だけ direct write でもよい。
- 実運用前に backend ingest に寄せる。

## 18. OpenAPI client 更新手順

backend API 変更後:

1. `app/models.py` を更新する。
2. Alembic migration を追加する。
3. route を追加し、`app/api/main.py` に include する。
4. backend OpenAPI を生成する。
5. frontend client を生成する。

既存 script:

```bash
npm run update-api
```

この script は `uv --directory ../coding-contest-backend run python scripts/generate_openapi.py` を呼び、続けて `openapi-ts` を実行する。

## 19. テスト方針

### 19.1 backend tests

追加したい test:

- submission 作成成功。
- 通常ユーザーはアクセスできない problem に提出できない。
- `AC`, `WA`, `RE`, `TLE`, `MLE`, `CE` の verdict mapping。
- AC 3回で unlock。
- unlock が client input を信用しない。
- Python static analysis が正常コードを解析できる。
- Python static analysis が syntax error を扱える。
- AI battle は unlock 前に作成できない。
- AI battle は他ユーザーの submission を使えない。
- perf ingest は invalid token を拒否する。
- perf ingest が run/context/metrics を保存する。

既存 test の整理:

- `email` / `is_active` 前提の stale tests を現行 `login_id` model に合わせる。
- contest/problem の access control test を先に固める。

### 19.2 frontend tests

追加したい test:

- 通常ユーザーが開催中 contest を見られる。
- problem page から提出できる。
- 提出結果 dialog が表示される。
- AC 3回未満では AI 対決 button が出ない。
- AC 3回以上で AI 対決 button が出る。
- AI battle setup が開く。
- evaluation table に user / AI metrics が表示される。

### 19.3 reviewer tests

追加したい test:

- `.pymon` fixture を parse できる。
- current run と previous run を比較できる。
- report に execution context が出る。
- env hash mismatch の時に confidence を下げる表示になる。
- notable change の時だけ LLM を呼ぶ。
- LLM prompt に関連 diff だけが入る。

## 20. 実装順序

推奨順序:

1. backend の既存 drift を直す。
   - `contest_problems` の権限チェックを DB write 前に移す。
   - stale tests を現行 model に合わせる。
2. `Submission` / `SubmissionCaseResult` model と migration を追加する。
3. `JudgeGateway` と Paiza provider を backend に実装する。
4. frontend 提出処理を backend API に切り替える。
5. AC count / unlock status API を追加する。
6. Python static analysis service を追加する。
7. AI battle model/API を追加する。
8. Vercel AI SDK と `@ai-sdk/anthropic` を frontend に追加する。
9. Next.js Route Handler で1モデル AI streaming を実装する。
10. stream 完了時に FastAPI へ generated code を保存する。
11. user/AI 同条件 judge と evaluation 作成を実装する。
12. evaluation UI を作る。
13. 3モデル UI と並列 streaming を拡張する。
14. pytest-monitor extractor と Supabase schema を作る。
15. Reviewer report 生成を実装する。
16. notable change に対する LLM diff comment を追加する。

## 21. 未決事項

Judge case:

- MVP で既存 `Problem.samples` をそのまま authoritative judge case にするか。
- AI 対決リリース前に hidden case を追加するか。

Language:

- MVP の AI 対決代表提出を Python3 のみに限定するか。

AI provider:

- MVP では Claude に限定する。
- `@ai-sdk/anthropic` 直結にするか、Vercel AI Gateway 経由にするか。
- model id の初期値を何にするか。

Supabase schema:

- Reviewer table を public schema に置くか、`perf` schema に分けるか。

Reviewer packaging:

- 各 repo に script を置くか。
- reusable GitHub Action にするか。
- この project の backend ingest service として提供するか。

Comparison target:

- PR では latest main run と比較するか。
- 同じ workflow 内で base/head を両方測るか。
