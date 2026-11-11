// The questions drawer is a working list on the call: questions can be removed
// and answered as the client talks. That state lives in sessionStorage, so it
// survives page switches and reloads for this browser session, is shared by
// both flow views, and never leaks into another person's session.
//
// It is stamped against the question content, so a changed content pack never
// shows answers against the wrong questions.
import { useCallback, useEffect, useState } from 'react'
import type { QuestionGroup } from '../../lib/types'

export interface QuestionState {
  /** keys of removed questions, `${groupId}-${index}` */
  removed: string[]
  /** answers typed on the call, by question key */
  answers: Record<string, string>
}

const EMPTY: QuestionState = { removed: [], answers: {} }
const EVENT = 'questions-state-changed'

export const questionKey = (groupId: string, index: number) => `${groupId}-${index}`

function stampOf(groups: QuestionGroup[]): string {
  const text = groups.map((g) => g.id + ':' + g.questions.map((q) => q.q).join('|')).join('#')
  let h = 0
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0
  return (h >>> 0).toString(36)
}

const storageKey = (groups: QuestionGroup[]) => `presales-questions:v1:${stampOf(groups)}`

function read(groups: QuestionGroup[]): QuestionState {
  try {
    const raw = sessionStorage.getItem(storageKey(groups))
    if (!raw) return EMPTY
    const v = JSON.parse(raw) as QuestionState
    return { removed: Array.isArray(v.removed) ? v.removed : [], answers: v.answers && typeof v.answers === 'object' ? v.answers : {} }
  } catch {
    return EMPTY
  }
}

function write(groups: QuestionGroup[], s: QuestionState) {
  try {
    sessionStorage.setItem(storageKey(groups), JSON.stringify(s))
  } catch {
    /* storage blocked: the drawer still works, it just will not persist */
  }
  window.dispatchEvent(new Event(EVENT))
}

export function useQuestionState(groups: QuestionGroup[]) {
  const [state, setState] = useState<QuestionState>(() => read(groups))

  // Both views mount their own drawer; keep them in step.
  useEffect(() => {
    const sync = () => setState(read(groups))
    window.addEventListener(EVENT, sync)
    return () => window.removeEventListener(EVENT, sync)
  }, [groups])

  const update = useCallback(
    (fn: (s: QuestionState) => QuestionState) => {
      const next = fn(read(groups))
      write(groups, next)
      setState(next)
    },
    [groups],
  )

  const remove = (key: string) => update((s) => ({ ...s, removed: [...new Set([...s.removed, key])] }))
  const restoreAll = () => update((s) => ({ ...s, removed: [] }))
  const setAnswer = (key: string, text: string) =>
    update((s) => {
      const answers = { ...s.answers }
      if (text.trim()) answers[key] = text
      else delete answers[key]
      return { ...s, answers }
    })
  const replace = (next: QuestionState) => update(() => next)

  const remaining = groups.reduce((n, g) => n + g.questions.filter((_, i) => !state.removed.includes(questionKey(g.id, i))).length, 0)
  const answered = Object.keys(state.answers).filter((k) => !state.removed.includes(k)).length

  return { state, remove, restoreAll, setAnswer, replace, remaining, answered }
}

/**
 * Rebuild the drawer state from an exported file by matching question TEXT,
 * not position: a file exported before the list was edited must never put
 * its answers against shifted questions. Questions that no longer exist are
 * dropped; ones added since are left unanswered.
 */
export function questionsFromImport(groups: QuestionGroup[], exported: unknown): QuestionState {
  const e = exported as {
    groups?: { questions?: { question?: string; answer?: string }[] }[]
    removedQuestions?: string[]
  }
  const keyByText = new Map<string, string>()
  groups.forEach((g) => g.questions.forEach((q, i) => keyByText.set(q.q.trim(), questionKey(g.id, i))))
  const answers: Record<string, string> = {}
  for (const g of e?.groups ?? [])
    for (const q of g.questions ?? []) {
      const key = q.question ? keyByText.get(q.question.trim()) : undefined
      if (key && q.answer && q.answer.trim()) answers[key] = q.answer
    }
  const removed = (e?.removedQuestions ?? []).map((t) => keyByText.get(t.trim())).filter((k): k is string => !!k)
  return { removed, answers }
}

/** The questions as they stand, readable, for an export file. */
export function questionsForExport(groups: QuestionGroup[], s: QuestionState) {
  return {
    note: 'Questions for the call, as they stood when this file was exported. Removed questions are left out.',
    groups: groups
      .map((g) => ({
        title: g.title,
        questions: g.questions
          .map((q, i) => ({ key: questionKey(g.id, i), question: q.q, why: q.why, answer: s.answers[questionKey(g.id, i)] ?? '' }))
          .filter((q) => !s.removed.includes(q.key)),
      }))
      .filter((g) => g.questions.length),
    // removed questions by text, so an import can match them even if the list changed
    removedQuestions: groups.flatMap((g) => g.questions.filter((_, i) => s.removed.includes(questionKey(g.id, i))).map((q) => q.q)),
    state: s,
  }
}
