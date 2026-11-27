import { lazy, Suspense, useState } from 'react'
import { DataContext, useLoadAppData } from './hooks/useData'
import { ToastProvider, ToastSlot } from './components/Toast'
import { TabBar, type Tab } from './components/TabBar'
import { SeanceScreen } from './screens/seance/SeanceScreen'
import { HistoriqueScreen } from './screens/historique/HistoriqueScreen'
import { ReglagesScreen } from './screens/reglages/ReglagesScreen'

// Les graphiques (plus lourds) ne sont chargés qu'à l'ouverture de l'onglet Progrès.
const ProgresScreen = lazy(() => import('./screens/progres/ProgresScreen').then((m) => ({ default: m.ProgresScreen })))

export function App() {
  const data = useLoadAppData()
  // Pas d'écran d'accueil : l'app s'ouvre toujours sur la séance.
  const [tab, setTab] = useState<Tab>('seance')

  if (!data) return <div className="h-full bg-bg" />

  return (
    <DataContext.Provider value={data}>
      <ToastProvider>
        <div className="flex h-full flex-col">
          <main className="relative min-h-0 flex-1">
            {tab === 'seance' && <SeanceScreen />}
            {tab === 'historique' && <HistoriqueScreen />}
            {tab === 'progres' && (
              <Suspense fallback={null}>
                <ProgresScreen />
              </Suspense>
            )}
            {tab === 'reglages' && <ReglagesScreen />}
            <ToastSlot fallback className="bottom-3" />
          </main>
          <TabBar tab={tab} onChange={setTab} sessionActive={!!data.active} />
        </div>
      </ToastProvider>
    </DataContext.Provider>
  )
}
