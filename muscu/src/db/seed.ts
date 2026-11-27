import type { Exercise, MuscleGroup } from './db'

type SeedRow = [id: string, name: string, bodyweight?: boolean]

const SEED: Record<MuscleGroup, SeedRow[]> = {
  Pectoraux: [
    ['developpe-couche', 'Développé couché'],
    ['developpe-incline', 'Développé incliné'],
    ['developpe-couche-halteres', 'Développé couché haltères'],
    ['developpe-incline-halteres', 'Développé incliné haltères'],
    ['ecarte-halteres', 'Écarté haltères'],
    ['ecarte-poulie', 'Écarté à la poulie'],
    ['pec-deck', 'Pec deck'],
    ['dips', 'Dips', true],
    ['pompes', 'Pompes', true],
  ],
  Dos: [
    ['tractions', 'Tractions', true],
    ['tirage-vertical', 'Tirage vertical'],
    ['rowing-barre', 'Rowing barre'],
    ['rowing-haltere', 'Rowing haltère'],
    ['tirage-horizontal', 'Tirage horizontal'],
    ['souleve-de-terre', 'Soulevé de terre'],
    ['pull-over', 'Pull-over'],
    ['shrugs', 'Shrugs'],
  ],
  Épaules: [
    ['developpe-militaire', 'Développé militaire'],
    ['developpe-halteres-assis', 'Développé haltères assis'],
    ['elevations-laterales', 'Élévations latérales'],
    ['elevations-frontales', 'Élévations frontales'],
    ['oiseau', 'Oiseau'],
    ['face-pull', 'Face pull'],
  ],
  Biceps: [
    ['curl-biceps', 'Curl biceps'],
    ['curl-halteres', 'Curl haltères'],
    ['curl-marteau', 'Curl marteau'],
    ['curl-pupitre', 'Curl pupitre'],
    ['curl-poulie', 'Curl à la poulie'],
  ],
  Triceps: [
    ['extension-triceps', 'Extension triceps'],
    ['barre-au-front', 'Barre au front'],
    ['extension-nuque', 'Extension nuque haltère'],
    ['developpe-prise-serree', 'Développé couché prise serrée'],
    ['dips-bancs', 'Dips entre bancs', true],
  ],
  Jambes: [
    ['squat', 'Squat'],
    ['presse-cuisses', 'Presse à cuisses'],
    ['fentes', 'Fentes'],
    ['souleve-de-terre-roumain', 'Soulevé de terre roumain'],
    ['leg-extension', 'Leg extension'],
    ['leg-curl', 'Leg curl'],
    ['hip-thrust', 'Hip thrust'],
    ['mollets-debout', 'Mollets debout'],
    ['mollets-assis', 'Mollets assis'],
  ],
  Abdos: [
    ['crunch', 'Crunch'],
    ['crunch-poulie', 'Crunch à la poulie'],
    ['releves-jambes', 'Relevés de jambes', true],
    ['roue-abdominale', 'Roue abdominale', true],
  ],
}

export function seedExercises(now = Date.now()): Exercise[] {
  const out: Exercise[] = []
  for (const [group, rows] of Object.entries(SEED) as [MuscleGroup, SeedRow[]][]) {
    for (const [id, name, bodyweight] of rows) {
      out.push({ id, name, group, bodyweight: !!bodyweight, custom: false, archived: false, createdAt: now })
    }
  }
  return out
}
