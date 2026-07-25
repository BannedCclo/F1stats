import { API_BASE } from './endpoints'

/**
 * Thrown for a session/round that simply hasn't happened yet (HTTP 404 on a
 * future round). Callers should render an empty/"not held yet" state, not an
 * error boundary.
 */
export class NotYetAvailableError extends Error {
  constructor(path: string) {
    super(`Not yet available: ${path}`)
    this.name = 'NotYetAvailableError'
  }
}

export class ApiError extends Error {
  status: number

  constructor(status: number, path: string) {
    super(`API error ${status} on ${path}`)
    this.name = 'ApiError'
    this.status = status
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`)

  if (res.status === 404) {
    throw new NotYetAvailableError(path)
  }
  if (!res.ok) {
    throw new ApiError(res.status, path)
  }

  return (await res.json()) as T
}
