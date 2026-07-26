import { useI18n } from '@/i18n/useI18n'
import { useStartLights } from '@/motion/useStartLights'

interface StartLightsProps {
  onDone: () => void
}

/**
 * Five red lights, in sequence, then out — the one loading moment F1 owns
 * more than any other. See useStartLights for the session gate, the
 * reduced-motion skip, and the abort-on-any-input behaviour.
 *
 * rounded-full is the one deliberate exception to this app's "no rounded
 * corners" rule: these are literal round lamps on a start gantry, not a
 * stylistic drift.
 */
export default function StartLights({ onDone }: StartLightsProps) {
  const { t } = useI18n()
  const { visible, root } = useStartLights(onDone)

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 bg-carbon">
      <div ref={root} className="flex gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <span
            key={i}
            data-light
            aria-hidden="true"
            className="h-10 w-10 rounded-full bg-rosso opacity-0 sm:h-14 sm:w-14"
          />
        ))}
      </div>
      <p className="font-data text-xs uppercase tracking-widest text-dim">{t('startLights.skipHint')}</p>
    </div>
  )
}
