import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import type { NextFunction, Request, Response } from "express"

const upstashUrl = process.env.UPSTASH_REDIS_REST_URL
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN
const ratelimit = (() => {
  if (!upstashUrl || !upstashToken) {
    return null
  }

  try {
    return new Ratelimit({
      redis: new Redis({
        url: upstashUrl,
        token: upstashToken,
      }),
      limiter: Ratelimit.fixedWindow(100, "10 m"),
      analytics: true,
    })
  } catch (error) {
    console.error("Failed to initialize Upstash rate limiter:", error)
    return null
  }
})()

export async function rateLimitMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const forwardedFor = req.headers["x-forwarded-for"]
  const clientIp = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : forwardedFor?.split(",")[0]?.trim()
  const ip = clientIp || req.ip || "anonymous"

  if (ratelimit) {
    try {
      const { success, limit, remaining, reset } = await ratelimit.limit(ip)

      if (!success) {
        res.set({
          "X-RateLimit-Limit": limit.toString(),
          "X-RateLimit-Remaining": remaining.toString(),
          "X-RateLimit-Reset": reset.toString(),
        })
        return res.status(429).send("Rate limit exceeded")
      }

      res.set({
        "X-RateLimit-Limit": limit.toString(),
        "X-RateLimit-Remaining": remaining.toString(),
        "X-RateLimit-Reset": reset.toString(),
      })
      return next()
    } catch (error) {
      console.error("Rate limiter failed in middleware:", error)
    }
  }

  return next()
}
