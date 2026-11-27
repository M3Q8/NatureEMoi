import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/db'
import {
  addExerciseToSession, addSet, createExercise, deleteDemoData, deleteExercise, deleteSet,
  finishSession, getActiveSession, restoreSession, startSession, updateSet,
} from '../db/actions'
import { exportData, importData, parseBackup } from '../lib/backup'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

describe('premier lancement', () => {
  it('contient la liste d’exercices et des données de démo', async () => {
    expect(await db.exercises.count()).toBeGreaterThan(40)
    const sessions = await db.sessions.toArray()
    expect(sessions.length).toBeGreaterThan(15)
    expect(sessions.every((s) => s.demo && s.endedAt !== null)).toBe(true)
    // chaque exercice des démos existe dans la liste
    const ids = new Set((await db.exercises.toArray()).map((e) => e.id))
    expect(sessions.flatMap((s) => s.exercises).every((e) => ids.has(e.exerciseId))).toBe(true)
  })

  it('les données de démo se suppriment d’un coup', async () => {
    await deleteDemoData()
    expect(await db.sessions.count()).toBe(0)
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
    const previous = (await db.sessions.orderBy('startedAt').last())!
    const id = await startSession(previous)
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
    expect(await deleteExercise('developpe-couche')).toBe('archived')
    expect((await db.exercises.get('developpe-couche'))?.archived).toBe(true)
    const id = await createExercise({ name: '  Hack squat ', group: 'Jambes', bodyweight: false })
    expect((await db.exercises.get(id))?.name).toBe('Hack squat')
    expect(await deleteExercise(id)).toBe('deleted')
  })
})

describe('sauvegarde', () => {
  it('export puis import restaure tout', async () => {
    const backup = await exportData()
    const json = JSON.stringify(backup)
    await db.sessions.clear()
    await db.exercises.clear()
    await importData(parseBackup(json))
    expect(await db.sessions.count()).toBe(backup.sessions.length)
    expect(await db.exercises.count()).toBe(backup.exercises.length)
  })

  it('refuse un fichier qui n’est pas une sauvegarde', () => {
    expect(() => parseBackup('{"hello":1}')).toThrow(/pas une sauvegarde/)
    expect(() => parseBackup('pas du json')).toThrow(/JSON/)
  })
})
