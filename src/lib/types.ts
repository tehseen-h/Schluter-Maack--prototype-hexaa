// ============================================================================
//  CONTENT PACK SCHEMA
//  ---------------------------------------------------------------------------
//  This is the ONLY thing that changes per client. The app (the "engine") reads
//  these shapes and renders the whole demo. A new project = a new /content pack.
//  Nothing in /src/components or /src/pages should need editing per project.
// ============================================================================
import type { Stage } from './simulate'

export type Severity = 'critical' | 'high' | 'medium' | 'low'

/** Top-level identity + branding for the demo. */
export interface Project {
  /** The client/company this demo is built FOR. Shown big in the header. */
  client: string
  /** One short line under the client name describing the workflow. */
  subtitle: string
  /** Branding line under the title. Keep as "Created by Hexaa". */
  createdBy: string
  /** Optional exact accent hex to override the default (e.g. Hexaa brand). */
  accent?: string
  /** A few key/value facts shown at the top of the Overview for context. */
  identity: KV[]
  /** "Human retains" boundaries, things the tool must NOT do. A selling point. */
  boundaries: string[]
  /** Optional one-liner describing what this project/case is. */
  caseSummary?: string
  /**
   * The four page names, in the client's own words. Sidebar and top bar both
   * read these. Any left out fall back to the kit's generic names.
   */
  pages?: Partial<Record<'overview' | 'intake' | 'exceptions' | 'flow', string>>
  /** Overview section headings, in the client's own words. Defaults if omitted. */
  sections?: {
    /** Heading over the extracted values (when there is no `comparison`). */
    pulledOut?: string
    pulledOutCaption?: string
    /** The findings box in the right rail. */
    needsAttention?: string
    /** One or two plain sentences under the findings: what happens next. */
    needsAttentionNote?: string
    /** The button under it. */
    reviewAll?: string
    /** The document list in the right rail (when there is no `packList`). */
    cameIn?: string
    /** The human-retains box. */
    humanControl?: string
    /**
     * The approve button on each finding, and its done state. "Approve" alone
     * can read as approving the whole job (paying an invoice, releasing a
     * payment), which stays human, so say what is actually being approved.
     */
    approve?: string
    approved?: string
    /** One line under the findings saying what approving does (and does not do). */
    approveNote?: string
    /** Eyebrow over the findings on the Exceptions page. Default "Findings". */
    findings?: string
    /** Hint beside it. */
    findingsHint?: string
    /** Label before each finding's `routeTo`. Default "Routed to". */
    routeLabel?: string
  }
  /**
   * Which documents the Overview is about. A content pack often defines extra
   * documents for the other Intake cases; the Overview should only list the
   * main case's own papers. Omit to list every document.
   */
  mainDocs?: string[]
}

export interface KV {
  label: string
  value: string
  mono?: boolean
  /** Optional field key so this value can be targeted for highlighting. */
  key?: string
}

/** A field as it appears inside a source document (used by the doc viewer). */
export interface DocField {
  key: string
  label: string
  value: string
  mono?: boolean
}

/** A source document that "came in" to the workflow. */
export interface SourceDoc {
  id: string
  /** Human name, e.g. "Supplier Invoice". */
  name: string
  /** Free label of the kind of doc, shown as a chip, e.g. "Invoice". */
  kind: string
  /** File format label shown to the user. */
  format: DocFormat
  /**
   * PHOTO: the paper arrived as a phone photo, not a clean PDF. The viewer
   * draws it as a photographed page (tilted, shadowed, with a capture strip),
   * and every highlight still works because it is the same rendered paper.
   */
  photo?: { caption: string; tilt?: number }
  /** Overrides the format chip's words for this document, e.g. "From the ledger". */
  formatLabel?: string
  /**
   * SYSTEM RECORD: not a paper at all but a record read from the client's own
   * system (e.g. the order as recorded). Drawn as a plain card of the values read,
   * deliberately NOT as an imitation of their screen: they know what their own
   * system looks like, and a made-up screen invites "that is not ours".
   * `source` names where it came from, `note` says what the card is.
   */
  system?: { source: string; status?: string; note?: string }
  /**
   * DOCUMENT MODE (recommended): render a faithful, styled document from data.
   * Each field is highlightable by `key`, no pixel coordinates needed.
   */
  render?: DocRender
  /**
   * IMAGE MODE (optional): a real image in /public/samples with highlight boxes
   * given as normalized 0..1 coordinates. Use for real client sample scans.
   */
  image?: {
    src: string
    boxes?: { fieldKey: string; x: number; y: number; w: number; h: number }[]
  }
}

/** How a document reached us. 'Photo' = a phone photo, 'System' = a record in their system. */
export type DocFormat = 'PDF' | 'Excel' | 'CSV' | 'Word' | 'Image' | 'Photo' | 'System'

/** The words shown on a format chip. */
export const FORMAT_LABEL: Record<DocFormat, string> = {
  PDF: 'PDF',
  Excel: 'Excel',
  CSV: 'CSV',
  Word: 'Word',
  Image: 'Image',
  Photo: 'Phone photo',
  System: 'System record',
}

export interface DocRender {
  heading: string
  subheading?: string
  meta?: KV[]
  sections?: { title?: string; fields: DocField[] }[]
  table?: { columns: string[]; rows: DocRow[] }
  footer?: KV[]
}

/** A table row; cells map to columns. `keys` lets a cell be highlightable. */
export interface DocRow {
  cells: string[]
  /** Optional field-key per cell (same length as cells) for highlight linking. */
  keys?: (string | null)[]
  /**
   * Figures in this row use the monospaced face. Only the cells that read as a
   * figure (an amount, a quantity, a rate) are mono AND right-aligned, short
   * codes with digits (a part number) are mono, and descriptions stay in the
   * normal face, so a label never ends up right-aligned in a code font.
   */
  mono?: boolean
}

/** A single value the system "pulled out", with provenance back to a document. */
export interface ExtractedField {
  label: string
  value: string
  mono?: boolean
  /** Which SourceDoc this came from (provenance). */
  docId: string
  /** Which field inside that doc (enables click-to-highlight). */
  fieldKey?: string
  /** Grouping bucket on the Overview, e.g. "Commercial", "Parties". */
  group: string
  /** Primary = always visible. Secondary (false) = inside the collapsible tray. */
  primary?: boolean
}

/** A flagged problem for human review. */
export interface Exception {
  id: string
  title: string
  severity: Severity
  detail: string
  /** Optional suggested next action (kept human, never auto-applied). */
  suggestion?: string
  /** Provenance: which doc + field it points at (drives highlighting). */
  docId?: string
  fieldKey?: string
  /**
   * The OTHER side of the comparison, when the finding is a mismatch between
   * two documents (e.g. what was specified vs the evidence supplied for it).
   * Powers a second tab on the Exceptions page so both sides can be seen.
   */
  against?: { docId: string; fieldKey?: string; label: string }
  /** Short routing label, e.g. "Coordinator", "Underwriter". */
  routeTo?: string
}

/** One document required for an Intake case, a checklist row, not a full SourceDoc. */
export interface IntakeDocRef {
  /** Which SourceDoc this refers to (rendered on Intake/Exceptions from documents.ts). */
  docId: string
  /** Label shown on the checklist row, e.g. "Architect's specification, Rev C". */
  label: string
  format: DocFormat
}

/**
 * Intake page: one real unit of work. Some cases only need one document; a
 * package review needs several, the case simply lists what it needs, and
 * the Intake page only runs the check once every one of them has been added.
 */
/** The heading on the Intake page, in the client's own words for a unit of work. */
export interface IntakeIntro {
  title: string
  caption: string
  /** The button that takes a flagged case to the findings. Default "Review the flags". */
  reviewLabel?: string
  /**
   * A heading over the document checklist, saying whose documents these are,
   * e.g. "Papers the supplier sent". Matters when the check later finds
   * something a third party requires that nobody sent: the checklist is what
   * arrived, the rule is what was required, and the two must not blur.
   */
  docsHeading?: string
  /** The client's word for one document and for several, e.g. paper / papers. */
  docWord?: { one: string; many: string }
  /**
   * The label on the run button, in the client's own word for doing the check.
   * "Run the reconciliation" is an accounts word and reads wrong on a charter
   * desk, a claims desk or a hiring pipeline. Omit it for "Run the check".
   */
  runLabel?: string
}

export interface IntakeCase {
  id: string
  name: string
  /** One line describing what this case demonstrates. */
  note: string
  /** Every document that must be brought in before this case can run. */
  docs: IntakeDocRef[]
  /** The staged pipeline result summary shown when it finishes. */
  outcome: 'clean' | 'exceptions' | 'blocked'
  /** Headline shown in the result banner, in the domain's own words. */
  resultTitle: string
  /** One or two sentences under the headline. */
  resultBody: string
  /**
   * A record the check pulls from the client's own system by itself, so nobody
   * adds it by hand. Shown above the checklist, never counted as a document.
   */
  pulled?: { label: string; note?: string }
  /**
   * What happens next, shown under the result: the values written back to
   * their system (`rows`), or a message drafted for a person to send
   * (`message`). Makes "clean" and "blocked" concrete instead of a banner.
   */
  followUp?: { title: string; caption?: string; rows?: KV[]; message?: string; badge?: string }
  /**
   * The live run for THIS case. Without `stages` the page steps through the
   * pack's generic `pipeline` as a plain checklist, as before. With them it
   * shows the papers being read field by field, the checks arriving as they
   * are made, and the sum being written out.
   */
  stages?: Stage[]
  /** The units-against-a-limit table this case produces, filled in during the run. */
  loads?: LoadsTable
  /** The sum this case produces, written out line by line during the run. */
  settlement?: Settlement
}

/** A row in the client's own master schedule, shown on the Overview page. */
export interface ScheduleRow {
  id: string
  /** The item reference, e.g. a door/set number. */
  ref: string
  /** Where it sits, e.g. a floor/location. */
  location: string
  /** A short descriptor, e.g. type/rating as currently recorded. */
  detail: string
  /** Evidence/certificate reference this row is checked against. */
  evidenceRef: string
  /** Plain-word status, never a count. */
  status: 'clear' | 'needs-review' | 'blocked'
  statusLabel: string
  /** If this row has a matching exception, jump straight to it. */
  exceptionId?: string
}

/**
 * The master-record section on the Overview, headings and all. Everything the
 * client would recognise as THEIR wording lives here, not in the page, so the
 * engine stays a template.
 */
export interface ScheduleTable {
  /** Section eyebrow, in the client's own words for this record. */
  title: string
  /** One or two lines: what this record is and why every check runs against it. */
  caption: string
  /** Optional right-hand note, e.g. "8 of 240 rows shown". Never a metric. */
  countNote?: string
  /**
   * Set when the record itself is a guess: that the client keeps a list like
   * this, in this shape, because the demo needed one. It renders a guess badge
   * on the section, the same convention the flows use.
   *
   * This exists because a master record is the most confident-looking thing on
   * the Overview and is easy to invent wholesale. If you made it up, say so
   * here and put a question in questions.ts.
   */
  assumption?: boolean
  /** One line under the badge: what exactly you are guessing at. */
  assumptionNote?: string
  /** Column headings, in the client's own words. */
  columns: {
    ref: string
    location: string
    detail: string
    evidenceRef: string
    status: string
  }
  rows: ScheduleRow[]
}

/**
 * The cross-check itself, on the Overview: one row per value, one column per
 * source, so a disagreement is visible without clicking anything. This is
 * the real content of a reconciliation job, shown as values, never counts.
 */
export interface ComparisonCell {
  value: string
  /** Links to a key in that column's document, for provenance. */
  fieldKey?: string
  /** This cell is the one that disagrees. */
  off?: boolean
}

export interface ComparisonRow {
  label: string
  /** Optional group heading this row sits under, e.g. "Parties". */
  group?: string
  /** One per column, in column order. null = this paper does not carry the value. */
  cells: (ComparisonCell | null)[]
  /** The finding this row raised. Makes the row open it on the Exceptions page. */
  exceptionId?: string
  /** Short words on the status chip when the row disagrees, e.g. "£500 apart". */
  offLabel?: string
  /** Figures and identifiers read best in the monospaced face; names do not. */
  mono?: boolean
}

export interface Comparison {
  title: string
  caption: string
  /** The sources, left to right. `label` is the column heading. */
  columns: { docId: string; label: string }[]
  rows: ComparisonRow[]
  /** Words for a cell with no value on that paper. Default "not on this paper". */
  emptyLabel?: string
  /** Chip words for a row that agrees. Default "Agrees". */
  agreeLabel?: string
  /**
   * Checks that passed on papers outside the grid's columns, one plain
   * sentence each. Shows how much was checked without inventing findings.
   */
  alsoChecked?: string[]
}

/**
 * What the pack must contain, and whether it does. Replaces the plain document
 * list on the Overview when the job is "is the pack complete", which differs
 * by whoever the pack is for.
 */
export interface PackItem {
  label: string
  status: 'in' | 'problem' | 'missing' | 'elsewhere'
  statusLabel: string
  /** The document that satisfies it, if one is in the pack. */
  docId?: string
  exceptionId?: string
}

export interface PackList {
  title: string
  caption: string
  assumption?: boolean
  assumptionNote?: string
  items: PackItem[]
}

// ── Units against a limit, and the sum worked out (optional) ───────────────────
// Some jobs are not one paper against another but MANY units against one limit: truck
// loads against a contract quantity, shipments against a letter of credit, invoices
// against a budget. `LoadsTable` shows each unit as a row with a running total, and
// `Settlement` shows the sum worked out from them, line by line.

/** A cell that needs a flag or a second line. A plain string is the usual cell. */
export interface LoadCell {
  value: string
  /** A small second line under the value, e.g. what the paper itself says. */
  note?: string
  /** This is the value that is wrong or past the limit. */
  off?: boolean
}

export interface LoadsRow {
  id: string
  /** One per column, in column order. */
  cells: (string | LoadCell)[]
  /** Plain words for the check on this row, and whether it passed. */
  status: { label: string; tone: 'ok' | 'flag' }
  /** The finding this row raised. Makes the row open it on the Exceptions page. */
  exceptionId?: string
}

export interface LoadsTable {
  title: string
  caption: string
  /** The limit everything is checked against, shown as a plain strip above the table. */
  limits: KV[]
  columns: string[]
  /** Column indexes that hold figures: right-aligned, monospaced. */
  figureCols?: number[]
  rows: LoadsRow[]
  /** A closing row, e.g. the total against the limit. Same length as `columns`. */
  footer?: (string | LoadCell)[]
}

/** One line of the sum: what it covers, how it was worked out, what it comes to. */
export interface SettlementLine {
  id: string
  /** The paper this line comes from, e.g. a receipt number. */
  ref: string
  what: string
  /** The working, e.g. "35,852 lb x 47.50 cents". */
  working: string
  amount: string
  /** `ready` is prepared for a person to release. `held` waits for a decision. */
  state: 'ready' | 'held'
  /** For a held line: what has to be decided. */
  why?: string
  exceptionId?: string
}

export interface Settlement {
  title: string
  caption: string
  /** The one-line stamp saying what this is NOT, e.g. "Prepared, not released". */
  stamp: string
  lines: SettlementLine[]
  /** Closing figures, in the order they should read. */
  totals: { label: string; value: string; tone?: 'ok' | 'hold' }[]
  /** One plain sentence under the totals. */
  note?: string
}

// ── Process flow (one left-to-right line) ──────────────────────────────────────
// This shape matches the `process-flow-diagram` skill exactly, so a per-project
// session can run that skill to change the diagram component with NO data
// rework. Two content files use it: flowToday.ts (the client's own process,
// drawn in flowchart symbols) and flow.ts (the same work with our part marked).

/** Which ownership lane a phase belongs to (drives its colour + boundary read). */
export type LaneKind = 'ours' | 'system' | 'human'

export interface FlowLane {
  id: LaneKind
  /** e.g. "You today", "hexaa does it", "You decide". */
  title: string
  caption: string
  /** Two or three words, used on the key and on every card header. */
  short?: string
}

/** A granular step inside a phase, only visible once its phase is expanded. */
export interface FlowStep {
  id: string
  title: string
  summary?: string
  /** who or what is responsible. */
  responsible?: string
  /** what this step records / produces. */
  records?: string
  /** who gets notified. */
  notifies?: string
  /** a note with the reason or source, editable live in the diagram panel. */
  note?: string
  /** inferred/invented rather than confirmed → renders a "guess" badge. */
  assumption?: boolean
}

/**
 * Standard flowchart symbol. Used by the "how it runs today" view, where the
 * symbol carries the meaning instead of an ownership colour.
 */
export type FlowShape = 'terminator' | 'process' | 'decision' | 'document' | 'manual'

export interface FlowPhase {
  id: string
  /** WHO does this step. Carried by the card colour, not by its position. */
  lane: LaneKind
  /** Draw this card as a standard flowchart symbol instead of an owner card. */
  shape?: FlowShape
  title: string
  summary: string
  /** tool / system names shown as chips on the collapsed card. */
  systems?: string[]
  assumption?: boolean
  /**
   * Where the card sits. Left out, it sits on the single left to right line.
   * 'up' lifts it above the line and 'down' drops it below.
   */
  track?: 'up' | 'down'
  steps: FlowStep[]
}

/** An edge between phases: `seq` = along the line; `down`/`up` = labelled side path. */
export interface FlowEdge {
  id: string
  source: string
  target: string
  kind: 'seq' | 'down' | 'up'
  label?: string
  /** Reserved for spacing two side paths that would otherwise collide. */
  offset?: number
}

/** A sticky note seeded on the canvas. `col` is its column in the note row. */
export interface FlowNote {
  id: string
  col: number
  text: string
  kind?: 'assumption'
}

export interface Flow {
  /** The key: who each colour means. Not bands. */
  lanes: FlowLane[]
  /** Document order is left to right order. */
  phases: FlowPhase[]
  edges: FlowEdge[]
  /** One short line for the toolbar: how to read the diagram. */
  readAs?: string
  /** The boundary sentence. */
  note?: string
  notes?: FlowNote[]
}

/**
 * The two words on the Exceptions page tabs. They name the two sides of a
 * mismatch, so they are client-facing words and belong in the content pack,
 * not in the page. "Specified" and "Evidence" suit a spec-versus-build job and
 * read oddly elsewhere: an order versus an invoice is "what we were billed"
 * versus "what we ordered".
 *
 * These are labels for two SLOTS, not two roles. Which document sits in which
 * slot is decided by your findings, not by these words, so write the words to
 * fit the documents rather than assuming the docId side is the authority. It
 * usually is not: the finding is normally anchored in the paper carrying the
 * wrong value, because that is where `fieldKey` has to highlight.
 */
export interface FindingSides {
  /** Names the tab showing the finding's own `docId`. */
  specified: string
  /** Names the tab showing `against`, the other paper. */
  evidence: string
}

/** One question to put to the client, with why it is worth asking. */
export interface ClientQuestion {
  q: string
  /** Optional: the reason, usually what we assumed and why it matters. */
  why?: string
}

export interface QuestionGroup {
  id: string
  title: string
  caption?: string
  questions: ClientQuestion[]
}

/** The full content pack the engine consumes. */
export interface ContentPack {
  project: Project
  documents: SourceDoc[]
  extracted: ExtractedField[]
  exceptions: Exception[]
  /** Optional: what to call the two sides of a mismatch. Defaults if omitted. */
  findingSides?: FindingSides
  cases: IntakeCase[]
  intakeIntro: IntakeIntro
  /** Optional: the client's own master record. Omit if there is no such record. */
  schedule?: ScheduleTable
  /** Optional: the cross-check as a grid of values, on the Overview. */
  comparison?: Comparison
  /** Optional: what the pack must contain, on the Overview. */
  packList?: PackList
  /** Optional: many units checked against one limit, on the Overview. */
  loads?: LoadsTable
  /** Optional: the sum worked out from them, on the Overview. */
  settlement?: Settlement
  pipeline: Stage[]
  questions: QuestionGroup[]
  flow: Flow
}
