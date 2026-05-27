import { useEffect, useState } from "react"

import type { ContestSummaryPublic } from "@/client"

const BOUNDARY_SETTLE_DELAY_MS = 100

const getServerOffset = (serverNow?: string) => {
  if (!serverNow) return 0

  const serverTime = Date.parse(serverNow)
  if (!Number.isFinite(serverTime)) return 0

  return serverTime - Date.now()
}

const getAdjustedNow = (offset: number) => Date.now() + offset

export const getNextContestBoundary = (
  contests: ContestSummaryPublic[],
  now: number,
) => {
  // Reference: github/relative-time-element src/relative-time-element.ts:19-33.
  // It calculates the next useful update interval from the target date distance.
  // Contest status only changes at start_at/end_at, so we choose that boundary.
  const futureBoundaries = contests
    .flatMap((contest) => [contest.start_at, contest.end_at])
    .map((value) => Date.parse(value))
    .filter((time) => Number.isFinite(time) && time > now)

  return futureBoundaries.length ? Math.min(...futureBoundaries) : null
}

export default function useContestBoundaryClock(
  contests: ContestSummaryPublic[],
  serverNow?: string,
) {
  const [serverOffset, setServerOffset] = useState(() =>
    getServerOffset(serverNow),
  )
  const [now, setNow] = useState(() => getAdjustedNow(serverOffset))

  useEffect(() => {
    const offset = getServerOffset(serverNow)
    setServerOffset(offset)
    setNow(getAdjustedNow(offset))
  }, [serverNow])

  useEffect(() => {
    // Reference: github/relative-time-element src/relative-time-element.ts:45-83.
    // It keeps all date-aware elements under one observer and schedules only the
    // nearest future update. This hook does the same for contest start/end times.
    const nextBoundary = getNextContestBoundary(contests, now)
    if (nextBoundary === null) return

    const delay = Math.max(
      nextBoundary - getAdjustedNow(serverOffset) + BOUNDARY_SETTLE_DELAY_MS,
      0,
    )

    const timer = window.setTimeout(() => {
      setNow(getAdjustedNow(serverOffset))
    }, delay)

    return () => {
      window.clearTimeout(timer)
    }
  }, [contests, now, serverOffset])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        setNow(getAdjustedNow(serverOffset))
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [serverOffset])

  return now
}
