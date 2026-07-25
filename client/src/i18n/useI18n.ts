import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { createElement } from 'react'
import en from './en'
import ptBR from './pt-BR'
import type { Dictionary } from './en'

export type Locale = 'en' | 'pt-BR'

const DICTIONARIES: Record<Locale, Dictionary> = {
  en,
  'pt-BR': ptBR,
}

const STORAGE_KEY = 'f1stats-locale'

type PathsOf<T, Prefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends string
    ? `${Prefix}${K}`
    : PathsOf<T[K], `${Prefix}${K}.`>
}[keyof T & string]

export type TranslationKey = PathsOf<Dictionary>

function resolve(dict: Dictionary, key: string): string {
  const parts = key.split('.')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let node: any = dict
  for (const part of parts) {
    node = node?.[part]
  }
  return typeof node === 'string' ? node : key
}

function detectInitialLocale(): Locale {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'en' || stored === 'pt-BR') return stored
  return navigator.language.toLowerCase().startsWith('pt') ? 'pt-BR' : 'en'
}

interface I18nContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: TranslationKey) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(detectInitialLocale)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, locale)
    document.documentElement.lang = locale === 'pt-BR' ? 'pt-BR' : 'en'
  }, [locale])

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      t: (key: TranslationKey) => resolve(DICTIONARIES[locale], key),
    }),
    [locale],
  )

  return createElement(I18nContext.Provider, { value }, children)
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}
