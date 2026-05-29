# WA Rev. 仕様書

Status: Draft
Last updated: 2026-05-28

## 1. 概要

WA Rev. は、既存の競技プログラミング Web アプリに追加する新規機能群である。

ユーザーはまず AI 補助なしで問題に取り組む。対象問題で一定回数 AC した後に、AI が生成した解法と自分の解法を同じ条件で実行し、実行時間、メモリ使用量、コード量、静的な複雑さを比較する。

この機能の実用上の核は、世界観そのものではなく次の4点にある。

- 人間の提出と AI の提出を同じ問題・同じ判定条件で比較する。
- 実行時間、メモリ使用量、コードサイズ、ネスト深さを数値で見せる。
- 評価コメントは数値比較を補足する短い説明に留める。
- 将来的に同じ思想を GitHub Actions の PR 性能レビューへ展開する。

PR レビュー機能では、WA Rev. 風の過剰な演出は使わない。コメントは中立的なエンジニアリングレビューとして出す。

## 2. 既存システム前提

この仕様は、現在の `coding-contest-web` と `coding-contest-backend` を前提にしている。

### 2.1 フロントエンド

既存構成:

- Next.js + React。
- TanStack Query を使用。
- backend OpenAPI から `src/client` を生成。
- 認証トークンは localStorage の `access_token` に保存。
- 通常ユーザー画面は `src/app/(dashboard)/page.tsx` に実装されている。
- 現在の提出実行は `src/lib/paiza.ts` と `src/hooks/usePaizaRunner.ts` で Paiza.io を直接呼び出している。
- Paiza.io は `next.config.ts` の `/api-paiza` rewrite 経由で呼ばれている。
- AI 生成 streaming は MVP で Vercel AI SDK を採用し、Next.js Route Handler に実装する。

現在の制約:

- 提出結果は永続化されていない。
- AC 回数は backend では数えられない。
- 判定結果は frontend 側で stdout と expected output を比較して決めている。
- 現時点では textarea がエディタであり、CodeMirror/Monaco は未導入。

### 2.2 バックエンド

既存構成:

- FastAPI。
- SQLModel。
- Alembic migration。
- PostgreSQL 接続。
- Supabase Postgres を DB として利用可能な構造。
- API prefix は `/api/v1`。
- 主要モデルは `User`, `Contest`, `Problem`, `ContestProblems`。

既存モデルの要点:

- `User` は `login_id`, `is_superuser`, `full_name`, `hashed_password`, `created_at` を持つ。
- `Contest` は `title`, `start_at`, `end_at`, `is_deleted`, timestamps を持つ。
- `Problem` は `name`, `time_limit`, `memory_limit`, `content`, `input_format`, `output_format`, `samples` を持つ。
- `Problem.samples` は現在3件固定。
- `ContestProblems` は contest と problem を `order_num` 付きで紐付ける。
- 通常ユーザーは開催中コンテストに紐づく問題だけ取得できる。

既存 backend の注意点:

- 永続化された `Submission` はまだ存在しない。
- backend 所有の judge endpoint はまだ存在しない。
- hidden judge case はまだ存在しない。
- 一部テストに旧テンプレート由来の `email` / `is_active` 前提が残っている。現時点の正は `app/models.py` と route 実装。
- `contest_problems.create_contest_problems` は権限チェック前に DB write しているため、新機能実装前に修正したい。

## 3. MVP のゴール

WA Rev. アプリ側 MVP:

- ログイン済みユーザーが開催中コンテストの問題に提出できる。
- 提出結果を backend に永続化する。
- 同一ユーザー・同一問題で AC が3回以上ある場合に AI 対決を解放する。
- MVP では AI モデルは1つだけ有効にする。
- データ構造と UI は最大3モデルに拡張できるようにする。
- AI は Python3 の正解コードを生成する。
- AI 生成 streaming は Vercel AI SDK `streamText` を使う。
- MVP の AI provider は Claude に限定してよい。
- ユーザー提出と AI 提出を同じ judge 経路で実行する。
- Python3 コードについて静的解析を行う。
- 比較結果画面で数値と短いコメントを表示する。

GitHub Actions Reviewer MVP:

- pytest-monitor を使って pytest item 単位の実行時間・メモリ使用量を取得する。
- `.pymon` SQLite DB から metrics と execution context を抽出する。
- Supabase に run, metrics, execution context を保存する。
- 過去 run と比較して、表と簡易グラフで表示する。
- 大きな変化がある場合だけ LLM が差分コードを読んでコメントする。
- デフォルトでは CI を落とさない。

## 4. MVP でやらないこと

- hidden case を前提にした本格 judge。
- 多言語の静的解析。
- AI 3モデル同時生成の完全実装。
- FastAPI による AI provider 直結 streaming。
- 厳密な performance regression gate。
- PR の性能変化による CI fail。
- pytest-monitor remote server の利用。
- PR コメントでの WA Rev. 風ロールプレイ。
- CodeMirror/Monaco の高度なテーマ連動。

## 5. 用語

Submission:

- ユーザーまたは AI が提出した1つのソースコード実行単位。

Judge result:

- `AC`, `WA`, `RE`, `TLE`, `MLE`, `CE` のいずれか。

AC count:

- 同一ユーザー・同一問題で永続化された AC 提出数。
- MVP では同じコードの重複提出も AC 数に含める。

AI battle:

- ユーザーの AC 提出と AI 生成コードを比較する対決セッション。

Evaluation:

- 実行結果と静的解析結果をまとめた比較結果。

pytest-monitor reviewer:

- GitHub Actions 上で pytest-monitor の結果を Supabase に保存し、PR に性能比較コメントを出す仕組み。

## 6. ユーザーフロー

### 6.1 通常提出

1. ユーザーがログインする。
2. 開催中コンテスト一覧を開く。
3. コンテストを選択する。
4. 問題を選択する。
5. コードを書く。
6. 提出する。
7. backend が judge を実行する。
8. backend が提出とケース別結果を保存する。
9. frontend が結果を表示する。

現在は frontend が Paiza.io を直接呼んでいるが、MVP では backend 経由に移す。AC 解放条件は client-side 判定を信用しない。

### 6.2 AI 対決の解放

1. backend が `(user_id, problem_id)` の AC 提出数を数える。
2. AC が3回未満なら AI 対決ボタンを非表示または disabled にする。
3. AC が3回以上なら AI 対決ボタンを表示する。
4. ユーザーは対決に使う自分の AC 提出を選択する。

MVP 推奨:

- WA Rev. 対決に使うユーザー提出は Python3 に限定する。

理由:

- AI 生成コードが Python3 前提。
- Python `ast` によるネスト深さ解析が MVP の主要指標。
- 多言語比較を最初から入れると評価軸が曖昧になる。

### 6.3 AI 生成

1. ユーザーが AI 対決を開始する。
2. FastAPI backend が unlock 条件を検証し、`AIBattle` を作成する。
3. frontend が Next.js Route Handler の AI stream endpoint を呼ぶ。
4. Next.js Route Handler が Vercel AI SDK `streamText` で Claude から Python3 コードを stream する。
5. frontend は生成過程をコード表示する。
6. stream 完了時に Next.js Route Handler が FastAPI backend へ生成コードを保存する。

MVP では streaming を実装する。Vercel AI SDK の `streamText` は text generation を stream し、`textStream` として generated text delta を扱えるため、コード生成ペインに適している。

FastAPI backend は AI provider API key を持たない構成でもよい。ただし、生成結果の永続化、judge、static analysis、evaluation は FastAPI backend が担当し、source of truth を維持する。

参照:

- Vercel AI SDK introduction: TypeScript toolkit として React / Next.js / Node.js などで AI application を構築するための SDK。複数 provider を統一 API で扱える。https://ai-sdk.dev/docs/introduction
- `streamText`: language model から text generation を stream する API。`textStream` は generated text deltas の AsyncIterable/ReadableStream。https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text
- Next.js App Router guide: Route Handler で `streamText` を呼び、streamed response を client に返す導線が示されている。https://ai-sdk.dev/docs/getting-started/nextjs-app-router
- Anthropic provider: Claude は `@ai-sdk/anthropic` provider または Vercel AI Gateway 経由で利用する。https://ai-sdk.dev/providers/ai-sdk-providers/anthropic

### 6.4 AI とユーザーの再判定

1. backend がユーザー代表提出を取得する。
2. backend が Next.js Route Handler から受け取った AI 生成コードを `Submission` として保存する。
3. backend がユーザー提出と AI 提出を同じ judge service で実行する。
4. backend が両方の静的解析を行う。
5. backend が `Evaluation` を作成する。
6. frontend が比較画面を表示する。

### 6.5 評価表示

比較画面に出すもの:

- participant: user / AI model。
- verdict。
- 実行時間。
- メモリ使用量。
- コードサイズ。
- 有効行数。
- 最大ネスト深さ。
- ケース別結果。
- 短い評価コメント。

評価コメントは「数値から言えること」と「確認観点」を中心にする。

例:

> AI の提出は provided cases 上では実行時間とコード量が小さいです。ユーザー提出はネストが深いため、入力サイズが大きいケースではループ構造を確認する価値があります。

## 7. 判定ケースの扱い

現在の `Problem.samples` は3件固定で、frontend でも「サンプル入出力」として表示されている。

MVP ではこの3件をそのまま判定ケースとして使える。ただし、その場合は本格的な hidden judge ではないため、画面文言と仕様上の扱いを明確にする。

MVP 推奨文言:

- 管理画面: 「判定ケース (3件固定)」
- 問題画面: 「入出力例」
- 判定 UI: 「判定ケース 1/2/3」

将来的には `ProblemJudgeCase` を追加し、sample case と hidden case を分ける。

## 8. 判定結果仕様

ケース別判定の優先順位:

1. `CE`: build failure / build error。
2. `MLE`: memory limit exceeded。
3. `TLE`: timeout または time limit exceeded。
4. `RE`: runtime error または非0 exit。
5. `WA`: stdout が expected output と一致しない。
6. `AC`: すべての条件を満たす。

全体判定:

- ケース順に見て最初の非 AC を全体判定にする。
- 全ケース AC の場合だけ全体 AC。

出力比較:

- CRLF を LF に正規化する。
- 各行末の空白は無視する。
- 末尾の空行は無視する。
- 行内の空白差分は無視しない。

## 9. 指標

### 9.1 実行系指標

Submission ごとに保存する。

- `total_time_ms`
- `peak_memory_kb`
- case 別 `time_ms`
- case 別 `memory_kb`
- verdict

Paiza.io の値は backend 側で正規化する。

既存 frontend の前提:

- Paiza `time` は seconds。
- Paiza `memory` は bytes。
- `Problem.time_limit` は ms として表示されている。
- `Problem.memory_limit` は GB として表示されている。

保存単位:

- time は ms。
- memory は KB。

### 9.2 静的解析指標

Python3 コードに対して保存する。

- `code_bytes`
- `physical_lines`
- `effective_lines`
- `max_nesting_depth`
- `parse_error`

`effective_lines` は空行とコメントのみの行を除く簡易行数。

`max_nesting_depth` は Python `ast` を使って計算する。完全な複雑度ではなく、コード形状を比較するための説明可能な簡易指標である。

## 10. pytest-monitor Reviewer 仕様

pytest-monitor が測るのは、pytest で実行された test item の resource consumption である。

つまり、任意の関数単体の純粋な実行時間ではない。対象処理を pytest test の中で呼ぶことで、その test item の実行時間・メモリ使用量として観測する。

例:

```python
def test_solve_large_case():
    assert solve(big_input) == expected
```

この場合、`TOTAL_TIME` は `solve(big_input)` の処理時間に近いが、pytest の呼び出し、fixture、assert、setup/teardown、計測オーバーヘッドを含みうる。

保存する metrics:

- `ITEM_VARIANT`
- `ITEM_FS_LOC`
- `KIND`
- `TOTAL_TIME`
- `USER_TIME`
- `KERNEL_TIME`
- `CPU_USAGE`
- `MEM_USAGE`
- `SESSION_H`
- `ENV_H`

保存する execution context:

- `CPU_COUNT`
- `CPU_FREQUENCY_MHZ`
- `CPU_VENDOR`
- `RAM_TOTAL_MB`
- `MACHINE_NODE`
- `MACHINE_TYPE`
- `MACHINE_ARCH`
- `SYSTEM_INFO`
- `PYTHON_INFO`
- `ENV_H`

レポートには execution context を必ず表示する。環境差は実行時間・メモリ使用量に直結するため、`ENV_H` が違う比較では断定的なコメントを避ける。

参考:

- https://pytest-monitor.readthedocs.io/en/latest/operating.html
- https://pytest-monitor.readthedocs.io/en/latest/configuration.html
- https://pytest-monitor.readthedocs.io/en/latest/run.html

## 11. Supabase 利用方針

Supabase Postgres を永続 DB とする。

WA Rev. アプリ側:

- 既存 backend は SQLModel + Alembic のまま使う。
- Supabase は PostgreSQL として扱う。
- browser から Supabase service role key を使わない。
- migration は backend repository に置く。

GitHub Actions Reviewer 側:

- pytest-monitor の結果を Supabase に保存する。
- 本番構成では GitHub Actions から backend の ingest endpoint に送信し、backend が Supabase に保存するのが望ましい。
- 初期検証では GitHub Actions から Supabase に直接 write してもよいが、CI に DB 権限を渡すリスクがある。

## 12. LLM コメント仕様

LLM は数値判定をしない。

LLM の役割:

- 大きな性能変化があった test について diff を読む。
- 変化の原因候補を説明する。
- 確認すべき観点を提案する。

LLM を呼ぶ条件:

- repository ごとに設定可能にする。
- MVP では単純な閾値でよい。
- 厳密な performance gate ではなく、コメント対象の抽出条件として扱う。

LLM に渡す情報:

- test 名。
- test file。
- 前回 metrics。
- 今回 metrics。
- execution context 比較。
- 関連する changed files。
- 関連 diff。

LLM 出力:

- summary。
- likely cause。
- suggestion。
- confidence。

禁止:

- 数値の改変。
- root cause の断定。
- diff にない原因の捏造。
- WA Rev. 風の過剰な演出。

## 13. MVP 受け入れ条件

WA Rev. アプリ:

- backend に `Submission` が保存される。
- judge 結果が backend で確定する。
- frontend が backend submission API で提出できる。
- AC 3回で unlock status が true になる。
- unlock 後に AI 対決を開始できる。
- AI Python3 コードが生成・保存される。
- ユーザー提出と AI 提出が同じ judge 経路で比較される。
- Python 静的解析結果が保存される。
- 評価画面に実行時間、メモリ、コードサイズ、ネスト深さが表示される。
- 評価コメントが中立的で短い。

GitHub Actions Reviewer:

- GitHub Actions で pytest-monitor を実行できる。
- `.pymon` を parse できる。
- metrics と execution context を Supabase に保存できる。
- 過去 run と比較できる。
- markdown report に表と簡易グラフを出せる。
- execution context を report に表示できる。
- 大きな変化がある場合のみ LLM コメントを作る。
- デフォルトでは性能変化で CI を落とさない。

## 14. 段階的開発

Phase 1: backend submission 化

- `Submission` と case result を追加。
- backend judge service を作る。
- frontend の Paiza 直接呼び出しを backend API に置き換える。

Phase 2: unlock

- AC count endpoint を作る。
- 問題画面に unlock status を表示する。
- AC 3回で AI 対決ボタンを出す。

Phase 3: static analysis

- Python AST 解析 service を作る。
- 提出保存時に code metrics を保存する。

Phase 4: AI battle MVP

- AI battle model/API を追加。
- Next.js Route Handler に Vercel AI SDK `streamText` による1モデル生成を実装。
- stream 完了時に FastAPI backend へ生成コードを保存する。
- ユーザー提出と AI 提出を同条件で judge する。
- 評価画面を作る。

Phase 5: multi-model UI

- 最大3モデル選択を有効化。
- streaming UI を整える。

Phase 6: GitHub Actions Reviewer

- `.pymon` 抽出 script を作る。
- Supabase schema を作る。
- report 生成を作る。
- 大きな変化のみ LLM コメントを追加する。

Phase 7: hidden judge cases

- `ProblemJudgeCase` を追加。
- sample と hidden を分ける。
- 管理画面を拡張する。
