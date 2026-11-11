// The fake processing pipeline. There is no real logic, these are just stages
// with believable timing so the demo "feels" like it's working. Predefined
// results are fine, because we made the sample files and know their outcomes.
//
// The stage list itself is domain content (its labels should read in the
// client's own words), so it lives in the content pack at
// src/content/pipeline.ts. This file only holds the generic shape + helper.
export interface Stage {
  id: string
  label: string
  ms: number
  /**
   * What the live panel shows while this stage runs (optional):
   *   read     a paper, with the highlight moving across `keys` in order
   *   panel    the case's loads table, or its settlement, filling in row by row
   */
  show?: { read: string; keys: string[] } | { panel: 'loads' | 'settlement' }
  /** Short lines that appear one by one during the stage, e.g. check results. */
  notes?: { text: string; tone?: 'ok' | 'flag' }[]
}

export const totalPipelineMs = (stages: Stage[]) => stages.reduce((a, s) => a + s.ms, 0)
