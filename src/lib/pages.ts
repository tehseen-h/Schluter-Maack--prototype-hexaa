import content from '../content'

export type PageId = 'overview' | 'intake' | 'exceptions' | 'flow'

/** Go to a page. `findingId` opens the Exceptions page on that finding. */
export type Navigate = (p: PageId, findingId?: string) => void

// Generic page names. A content pack renames them in the client's own words
// (project.pages), because "Exceptions" is a software word and theirs is not.
// Lives in its own module so the sidebar and the app shell can both read it
// without importing each other.
const DEFAULT_TITLES: Record<PageId, string> = {
  overview: 'Project Overview',
  intake: 'Intake',
  exceptions: 'Exceptions',
  flow: 'Process Flow',
}

export const TITLES: Record<PageId, string> = {
  ...DEFAULT_TITLES,
  ...Object.fromEntries(Object.entries(content.project.pages ?? {}).filter(([, v]) => typeof v === 'string' && v.trim())),
}
