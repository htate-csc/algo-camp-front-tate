# algo-camp-front-tate

プログラミングコンテスト管理画面のフロントエンドです。Next.js App Router、React、TypeScriptで実装されています。

## 技術構成

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- TanStack Query
- React Hook Form
- Biome
- hey-api openapi-ts

## 前提

- Node.js 18.18.0 以上 (推奨: v20.x または v22.x、動作確認済み: v24.15.0)
- npm 10.x 以上
- バックエンド: [algo-camp-api-tate](https://github.com/htate-csc/algo-camp-api-tate)

## セットアップ

```bash
npm install
```

## 開発サーバー

```bash
npm run dev
```

デフォルトでは `http://localhost:3000` で起動します。

APIの接続先は `NEXT_PUBLIC_API_URL` で指定できます。未設定の場合は `http://localhost:8000` を使用します。

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000 npm run dev
```

## ビルドと起動

```bash
npm run build
npm run start
```

## Lint

```bash
npm run lint
```

`biome check --write --unsafe` を実行するため、可能な修正は自動で反映されます。

## APIクライアント生成

バックエンドのOpenAPIスキーマから `src/client` 配下のAPIクライアントを生成します。

```bash
npm run update-api
```

このコマンドはバックエンドで `scripts/generate_openapi.py` を実行して `openapi.json` を更新し、その後 `openapi-ts` でクライアントを生成します。バックエンド側では `uv` が必要です。

生成された `src/client` 配下のファイルは原則として手動編集せず、スキーマ更新後に再生成してください。
