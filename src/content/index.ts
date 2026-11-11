import type { ContentPack } from '../lib/types'
import { project } from './project'
import { documents } from './documents'
import { extracted } from './extracted'
import { exceptions, findingSides } from './exceptions'
import { cases, intakeIntro } from './intake'
import { schedule } from './schedule'
import { comparison } from './comparison'
import { mainLoadsTable, mainSettlementView } from './workings'
import { pipeline } from './pipeline'
import { questions } from './questions'
import { flow } from './flow'

// The complete content pack the engine renders. This is the ONLY module the
// pages import. Swap the files above per client and everything updates.
//
// `flowToday` is imported by src/flow/data/process.ts rather than here, because
// the Process Flow page holds both flows side by side.
export const content: ContentPack = {
  project,
  documents,
  extracted,
  exceptions,
  findingSides,
  cases,
  intakeIntro,
  schedule,
  comparison,
  loads: mainLoadsTable,
  settlement: mainSettlementView,
  pipeline,
  questions,
  flow,
}

export default content
