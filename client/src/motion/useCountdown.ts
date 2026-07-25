import { useEffect, useState } from 'react'

export interface CountdownParts {
  days: number
  hours: number
  minutes: number
  seconds: number
  done: boolean
}

function diffToParts(target: number): CountdownParts {
  const diff = Math.max(0, target - Date.now())
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff % 86_400_000) / 3_600_000),
    minutes: Math.floor((diff % 3_600_000) / 60_000),
    seconds: Math.floor((diff % 60_000) / 1000),
    done: diff <= 0,
  }
}

export function useCountdown(targetIso: string | null | undefined): CountdownParts | null {
  const target = targetIso ? new Date(targetIso).getTime() : null
  const [parts, setParts] = useState<CountdownParts | null>(target ? diffToParts(target) : null)

  useEffect(() => {
    if (!target) {
      setParts(null)
      return
    }
    setParts(diffToParts(target))
    const id = setInterval(() => setParts(diffToParts(target)), 1000)
    return () => clearInterval(id)
  }, [target])

  return parts
}
