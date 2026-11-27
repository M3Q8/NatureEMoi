import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { getMeta } from '../../db/db'
import { addDemoData, deleteDemoData } from '../../db/actions'
import { useData } from '../../hooks/useData'
import { useToast } from '../../components/Toast'
import { ConfirmSheet } from '../../components/Sheet'
import { IconCheck, IconChevronRight, IconDownload, IconTrash, IconUpload, IconPlus } from '../../components/Icons'
import { exportData, importData, parseBackup, saveBackupFile, type Backup } from '../../lib/backup'
import { fmtDate, plural } from '../../lib/format'
import { ExercisesManager } from './ExercisesManager'

function Section({ title, children, footer }: { title: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col gap-2">
      <h2 className="mx-1 mt-5 text-[13px] font-bold tracking-[0.06em] text-muted uppercase">{title}</h2>
      <div className="flex flex-col gap-px overflow-hidden rounded-2xl bg-line">{children}</div>
      {footer && <p className="mx-1 text-[13px] leading-relaxed text-muted">{footer}</p>}
    </section>
  )
}

function Row({ icon, title, sub, onClick, danger, right }: {
  icon?: ReactNode
  title: string
  sub?: string
  onClick?: () => void
  danger?: boolean
  right?: ReactNode
}) {
  const content = (
    <>
      {icon && <span className={`shrink-0 ${danger ? 'text-danger' : 'text-accent'}`}>{icon}</span>}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={`text-[17px] font-semibold ${danger ? 'text-danger' : ''}`}>{title}</span>
        {sub && <span className="text-[13px] text-muted">{sub}</span>}
      </span>
      {right}
    </>
  )
  const cls = 'flex min-h-[60px] w-full items-center gap-3.5 bg-surface px-4 py-2.5 text-left'
  return onClick ? (
    <button type="button" onClick={onClick} className={`${cls} active:bg-raised`}>
      {content}
    </button>
  ) : (
    <div className={cls}>{content}</div>
  )
}

function daysAgo(ts: number): string {
  const d = Math.floor((Date.now() - ts) / 864e5)
  if (d <= 0) return 'aujourd’hui'
  if (d === 1) return 'hier'
  return `il y a ${d} jours`
}

export function ReglagesScreen() {
  const { exercises, sessions, hasDemo } = useData()
  const toast = useToast()
  const [view, setView] = useState<'main' | 'exercises'>('main')
  const [persisted, setPersisted] = useState<boolean | null>(null)
  const [pendingImport, setPendingImport] = useState<Backup | null>(null)
  const [confirmDemo, setConfirmDemo] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const lastExportAt = useLiveQuery(() => getMeta<number>('lastExportAt'), [])

  useEffect(() => {
    navigator.storage?.persisted?.().then(setPersisted, () => setPersisted(null))
  }, [])

  if (view === 'exercises') return <ExercisesManager onBack={() => setView('main')} />

  const onExport = async () => {
    try {
      const res = await saveBackupFile(await exportData())
      if (res !== 'cancelled') toast.show('Sauvegarde enregistrée')
    } catch {
      toast.show('L’export a échoué. Réessaie.')
    }
  }

  const onFile = async (file: File | undefined) => {
    if (!file) return
    try {
      setPendingImport(parseBackup(await file.text()))
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'Fichier illisible.')
    }
  }

  const askPersist = async () => {
    const ok = (await navigator.storage?.persist?.()) ?? false
    setPersisted(ok)
    toast.show(ok ? 'Stockage persistant activé' : 'Refusé par le navigateur pour l’instant')
  }

  const customCount = exercises.filter((e) => e.custom && !e.archived).length
  const visibleCount = exercises.filter((e) => !e.archived).length
  const demoCount = sessions.filter((s) => s.demo).length

  return (
    <div className="flex h-full flex-col">
      <div className="scroll-area pt-safe flex-1 px-4 pb-24">
        <h1 className="mx-1 mt-3 text-[34px] font-extrabold tracking-tight">Réglages</h1>

        <Section title="Exercices">
          <Row
            title="Mes exercices"
            sub={`${plural(visibleCount, 'exercice', 'exercices')}${customCount ? `, dont ${customCount} ajouté${customCount > 1 ? 's' : ''} par toi` : ''}`}
            onClick={() => setView('exercises')}
            right={<IconChevronRight size={20} className="shrink-0 text-muted" />}
          />
        </Section>

        <Section
          title="Sauvegarde"
          footer="Tes données sont uniquement sur ce téléphone. Exporte-les de temps en temps (vers Fichiers ou iCloud Drive) pour ne jamais les perdre."
        >
          <Row
            icon={<IconDownload size={24} />}
            title="Exporter mes données"
            sub={lastExportAt ? `Dernier export : ${daysAgo(lastExportAt)}` : 'Jamais exporté'}
            onClick={onExport}
          />
          <Row
            icon={<IconUpload size={24} />}
            title="Importer une sauvegarde"
            sub="Remplace les données actuelles"
            onClick={() => fileInput.current?.click()}
          />
        </Section>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            onFile(e.target.files?.[0])
            e.target.value = ''
          }}
        />

        <Section
          title="Stockage"
          footer={
            persisted === false
              ? 'Installer l’app sur l’écran d’accueil (Safari → Partager → Sur l’écran d’accueil) protège aussi tes données.'
              : undefined
          }
        >
          <Row
            title="Stockage persistant"
            sub={persisted === null ? 'Non disponible sur ce navigateur' : undefined}
            onClick={persisted === false ? askPersist : undefined}
            right={
              persisted ? (
                <span className="flex items-center gap-1.5 text-[15px] font-bold">
                  <IconCheck size={18} className="text-accent" />
                  Activé
                </span>
              ) : persisted === false ? (
                <span className="text-[15px] font-bold text-accent">Activer</span>
              ) : null
            }
          />
        </Section>

        <Section title="Données de démonstration">
          {hasDemo ? (
            <Row
              icon={<IconTrash size={22} />}
              danger
              title="Supprimer les données de démo"
              sub={plural(demoCount, 'séance d’exemple', 'séances d’exemple')}
              onClick={() => setConfirmDemo(true)}
            />
          ) : (
            <Row
              icon={<IconPlus size={22} />}
              title="Ajouter des données de démo"
              sub="Pour voir les graphiques avec des exemples"
              onClick={async () => {
                await addDemoData()
                toast.show('Données de démo ajoutées', () => deleteDemoData())
              }}
            />
          )}
        </Section>

        <p className="mx-1 mt-8 text-center text-[13px] text-muted">Version 1.0 · Fonctionne hors connexion</p>
      </div>

      <ConfirmSheet
        open={!!pendingImport}
        title="Remplacer toutes tes données ?"
        message={
          pendingImport
            ? `Sauvegarde${pendingImport.exportedAt ? ` du ${fmtDate(new Date(pendingImport.exportedAt).getTime())}` : ''} : ${plural(
                pendingImport.sessions.length,
                'séance',
                'séances',
              )} et ${plural(pendingImport.exercises.length, 'exercice', 'exercices')}. Les données actuelles de l’app seront remplacées.`
            : undefined
        }
        confirmLabel="Remplacer par la sauvegarde"
        onConfirm={async () => {
          if (!pendingImport) return
          const current = await exportData()
          await importData(pendingImport)
          toast.show('Sauvegarde restaurée', () => importData(current))
        }}
        onClose={() => setPendingImport(null)}
      />
      <ConfirmSheet
        open={confirmDemo}
        title="Supprimer les données de démo ?"
        message="Les séances d’exemple seront effacées. Tes propres séances sont conservées."
        confirmLabel="Supprimer la démo"
        onConfirm={async () => {
          const n = await deleteDemoData()
          toast.show(plural(n, 'séance de démo supprimée', 'séances de démo supprimées'))
        }}
        onClose={() => setConfirmDemo(false)}
      />
    </div>
  )
}
