import { beforeEach, describe, expect, it } from 'vitest'
import Dexie from 'dexie'
import { db, MuscuDB } from '../db/db'
import {
  addBodyWeight, addDemoData, addExerciseToSession, addSet, createExercise, createTemplate, deleteDemoData, deleteExercise, deleteSet,
  finishSession, getActiveSession, restoreSession, startSession, updateSet,
} from '../db/actions'
import { exportData, importData, parseBackup } from '../lib/backup'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

describe('premier lancement', () => {
  it('démarre vide, avec seulement la liste d’exercices', async () => {
    expect(await db.exercises.count()).toBeGreaterThan(40)
    expect(await db.sessions.count()).toBe(0)
  })

  it('les données de démo s’ajoutent depuis les réglages', async () => {
    await addDemoData()
    const sessions = await db.sessions.toArray()
    expect(sessions.length).toBeGreaterThan(15)
    expect(sessions.every((s) => s.demo && s.endedAt !== null)).toBe(true)
    // chaque exercice des démos existe dans la liste
    const ids = new Set((await db.exercises.toArray()).map((e) => e.id))
    expect(sessions.flatMap((s) => s.exercises).every((e) => ids.has(e.exerciseId))).toBe(true)
  })

  it('les données de démo se suppriment d’un coup', async () => {
    await addDemoData()
    await deleteDemoData()
    expect(await db.sessions.count()).toBe(0)
  })

  it('la mise à jour retire les démos déjà présentes sur le téléphone, pas les vraies séances', async () => {
    const name = 'muscu-ancienne-version'
    const old = new Dexie(name)
    old.version(1).stores({ exercises: 'id, name, group', sessions: 'id, startedAt', meta: 'key' })
    await old.table('sessions').bulkAdd([
      { id: 'demo1', startedAt: 1, endedAt: 2, exercises: [], demo: true },
      { id: 'vraie', startedAt: 3, endedAt: 4, exercises: [] },
    ])
    old.close()
    const updated = new MuscuDB(name)
    expect((await updated.sessions.toArray()).map((s) => s.id)).toEqual(['vraie'])
    updated.close()
  })
})

describe('séance', () => {
  it('ajout, modification, suppression et annulation de séries', async () => {
    await deleteDemoData()
    const id = await startSession()
    expect((await getActiveSession())?.id).toBe(id)
    const seId = await addExerciseToSession(id, 'developpe-couche')
    // même exercice deux fois : pas de doublon
    expect(await addExerciseToSession(id, 'developpe-couche')).toBe(seId)

    await addSet(id, seId, { reps: 10, weight: 60 })
    const beforeSecond = await addSet(id, seId, { reps: 10, weight: 60 })
    let s = (await db.sessions.get(id))!
    expect(s.exercises[0].sets).toHaveLength(2)

    await restoreSession(beforeSecond!) // « Annuler »
    s = (await db.sessions.get(id))!
    expect(s.exercises[0].sets).toHaveLength(1)

    const setId = s.exercises[0].sets[0].id
    await updateSet(id, seId, setId, { weight: 62.5 })
    expect((await db.sessions.get(id))!.exercises[0].sets[0].weight).toBe(62.5)
    await deleteSet(id, seId, setId)
    expect((await db.sessions.get(id))!.exercises[0].sets).toHaveLength(0)
  })

  it('refaire une séance précédente reprend les mêmes exercices', async () => {
    await addDemoData()
    const previous = (await db.sessions.orderBy('startedAt').last())!
    const id = await startSession(previous.exercises.map((e) => e.exerciseId))
    const s = (await db.sessions.get(id))!
    expect(s.exercises.map((e) => e.exerciseId)).toEqual(previous.exercises.map((e) => e.exerciseId))
    expect(s.exercises.every((e) => e.sets.length === 0)).toBe(true)
  })

  it('terminer : séance vide supprimée, séance oubliée datée de la dernière série', async () => {
    await deleteDemoData()
    const empty = await startSession(undefined, 1_000)
    expect((await finishSession(empty)).deleted).toBe(true)

    const t0 = Date.UTC(2026, 10, 1, 18)
    const id = await startSession(undefined, t0)
    const seId = await addExerciseToSession(id, 'squat')
    await addExerciseToSession(id, 'leg-curl') // prévu mais pas fait
    await addSet(id, seId, { reps: 8, weight: 80 }, t0 + 10 * 60000)
    await finishSession(id, t0 + 20 * 3600_000) // terminée le lendemain
    const s = (await db.sessions.get(id))!
    expect(s.endedAt).toBe(t0 + 15 * 60000)
    expect(s.exercises.map((e) => e.exerciseId)).toEqual(['squat'])
  })
})

describe('exercices', () => {
  it('un exercice utilisé est masqué, pas effacé', async () => {
    await addDemoData()
    expect(await deleteExercise('developpe-couche')).toBe('archived')
    expect((await db.exercises.get('developpe-couche'))?.archived).toBe(true)
    const id = await createExercise({ name: '  Hack squat ', group: 'Jambes', bodyweight: false })
    expect((await db.exercises.get(id))?.name).toBe('Hack squat')
    expect(await deleteExercise(id)).toBe('deleted')
  })
})

describe('modèles et poids du corps', () => {
  it('un modèle démarre une séance avec ses exercices', async () => {
    const tid = await createTemplate('Pecs', ['developpe-couche', 'dips', 'developpe-couche'])
    const t = (await db.templates.get(tid))!
    expect(t.exerciseIds).toEqual(['developpe-couche', 'dips'])
    const id = await startSession(t.exerciseIds)
    expect((await db.sessions.get(id))!.exercises.map((e) => e.exerciseId)).toEqual(['developpe-couche', 'dips'])
  })

  it('un seul poids du corps par jour', async () => {
    const day = new Date(2026, 10, 20, 8).getTime()
    await addBodyWeight(80, day)
    await addBodyWeight(79.6, day + 3600_000)
    await addBodyWeight(79.2, day + 864e5)
    expect((await db.bodyweights.orderBy('date').toArray()).map((b) => b.kg)).toEqual([79.6, 79.2])
  })

  it('les nouveaux exercices (gainage, cardio) existent', async () => {
    expect((await db.exercises.get('gainage'))?.kind).toBe('time')
    expect((await db.exercises.get('tapis'))?.group).toBe('Cardio')
  })

  it('la mise à jour ajoute les nouveaux exercices aux anciennes installations', async () => {
    const name = 'muscu-v2'
    const old = new Dexie(name)
    old.version(2).stores({ exercises: 'id, name, group', sessions: 'id, startedAt', meta: 'key' })
    await old.table('exercises').add({ id: 'squat', name: 'Squat perso', group: 'Jambes', bodyweight: false, custom: false, archived: false, createdAt: 0 })
    old.close()
    const updated = new MuscuDB(name)
    expect((await updated.exercises.get('squat'))?.name).toBe('Squat perso') // rien n'est écrasé
    expect(await updated.exercises.get('gainage')).toBeTruthy()
    expect(await updated.templates.count()).toBe(0)
    updated.close()
  })
})

describe('sauvegarde', () => {
  it('export puis import restaure tout', async () => {
    await addDemoData()
    await createTemplate('Jambes', ['squat'])
    await addBodyWeight(78.5)
    const backup = await exportData()
    const json = JSON.stringify(backup)
    await db.sessions.clear()
    await db.exercises.clear()
    await importData(parseBackup(json))
    expect(await db.sessions.count()).toBe(backup.sessions.length)
    expect(await db.exercises.count()).toBe(backup.exercises.length)
    expect(await db.templates.count()).toBe(1)
    expect(await db.bodyweights.count()).toBe(1)
  })

  it('accepte les sauvegardes de la première version', () => {
    const v1 = { app: 'my-app-muscu', version: 1, exercises: [], sessions: [] }
    expect(parseBackup(JSON.stringify(v1))).toMatchObject({ templates: [], bodyweights: [] })
  })

  it('refuse un fichier qui n’est pas une sauvegarde', () => {
    expect(() => parseBackup('{"hello":1}')).toThrow(/pas une sauvegarde/)
    expect(() => parseBackup('pas du json')).toThrow(/JSON/)
  })
})
