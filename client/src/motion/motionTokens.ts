/**
 * Single vocabulary for every anime.js call in the app. No route or component
 * should hardcode a duration, ease, or stagger value directly — they come
 * from here so the whole site moves at one tempo, like a single car's
 * telemetry rather than a dozen different animators' guesses.
 */

export const DURATION = {
  instant: 120,
  fast: 220,
  base: 360,
  reveal: 420,
  slow: 560,
  page: 320,
} as const

export const EASE = {
  standard: 'outQuad',
  decelerate: 'outCubic',
  accelerate: 'inQuad',
  emphasized: 'outExpo',
  snap: 'outBack',
} as const

export const STAGGER = {
  tight: 24,
  base: 40,
  loose: 64,
} as const

export const SPRING = {
  soft: { stiffness: 140, damping: 18 },
  firm: { stiffness: 220, damping: 26 },
} as const
