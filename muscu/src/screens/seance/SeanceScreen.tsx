import { useState } from 'react'
import { useData } from '../../hooks/useData'
import { useWakeLock } from '../../hooks/useWakeLock'
import { SessionEditor } from './SessionEditor'
import { StartView } from './StartView'
import { SummarySheet } from './SummarySheet'

export function SeanceScreen() {
  const { active, sessions } = useData()
  const [summaryId, setSummaryId] = useState<string | null>(null)
  // l'écran reste allumé pendant la séance
  useWakeLock(!!active)
  const summary = summaryId ? sessions.find((s) => s.id === summaryId && s.endedAt !== null) : undefined

  return (
    <>
      {active ? <SessionEditor key={active.id} session={active} mode="live" onFinished={setSummaryId} /> : <StartView />}
      {summary && <SummarySheet session={summary} onClose={() => setSummaryId(null)} />}
    </>
  )
}
