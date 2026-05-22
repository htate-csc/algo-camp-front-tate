import { useEffect, useState } from "react"

let globalOffset = 0 // アプリケーション全体で一度だけ同期して使い回す

export default function useCurrentTime() {
  const [time, setTime] = useState(Date.now() + globalOffset)

  useEffect(() => {
    const fetchServerTime = async () => {
      try {
        const start = Date.now()
        // CORSを回避しつつ現在時刻を正確に取得するため、自身のホスト（Webサーバー）にHEADリクエストを送信
        const res = await fetch(window.location.origin, { method: "HEAD" })
        const serverDate = res.headers.get("date")
        if (serverDate) {
          const serverTime = new Date(serverDate).getTime()
          const delay = (Date.now() - start) / 2 // RTT(往復時間)の半分をネットワーク遅延とみなして補正
          globalOffset = serverTime + delay - Date.now()
        }
      } catch (e) {
        console.error(
          "Failed to sync server time, falling back to local time",
          e,
        )
      }
    }

    if (globalOffset === 0) {
      fetchServerTime()
    }

    const interval = setInterval(() => {
      setTime(Date.now() + globalOffset)
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  return time
}
