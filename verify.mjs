#!/usr/bin/env node
/**
 * Kit verifier. Run at the END of a project build: `node verify.mjs`
 *
 * It performs the mechanical checks that are easy to get wrong, and prints a
 * PASS/FAIL report. A per-project Claude session should run this, then do the
 * semantic check described in CLAUDE.md (does the PDF cover every page/section
 * and match what was built) and fix anything flagged before calling it done.
 *
 * Checks:
 *   1. Content pack is filled (not left as the Northwind example).
 *   2. Provenance links resolve: every fieldKey referenced in extracted/
 *      exceptions exists as a key in documents (this powers highlighting).
 *   3. Both flows are real: flow.ts has lanes/edges/steps, and flowToday.ts
 *      exists and contains no step of ours (it is the client's own process),
 *      AND the two describe the same process rather than drifting apart.
 *   4. Every docId used by the intake cases and the findings is a real document.
 *   5. Every card carrying a guess badge has somewhere to be challenged: the
 *      first group of questions.ts is not thinner than the guesses on the
 *      diagram.
 *   6. No em dashes or en dashes anywhere in the content pack.
 *   7. A summary PDF exists somewhere in the project.
 *   8. The production build output exists (run `npm run build` first).
 *   9. The password lock is issued for THIS demo (src/content/access.ts):
 *      well formed, not expired, 14 days long.
 *  10. hexaa's private password suffix appears in NO file of the project,
 *      including the build output. The suffix is read from
 *      ~/.hexaa/demo-password-suffix (or HEXAA_DEMO_SUFFIX) and never printed.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { homedir, tmpdir } from 'node:os'
import { pathToFileURL } from 'node:url'

const ROOT = process.cwd()
const C = join(ROOT, 'src', 'content')
const read = (p) => { try { return readFileSync(p, 'utf8') } catch { return '' } }
const results = []
const ok = (m) => results.push(['PASS', m])
const warn = (m) => results.push(['WARN', m])
const fail = (m) => results.push(['FAIL', m])

// The content pack, EVALUATED. A pack may build its documents from a figures file (so every number
// is worked out, never typed), which a text scan cannot read. esbuild ships with vite, so bundle
// the pack and import it. If that fails the checks below fall back to scanning the source text.
let pack = null
try {
  const { build } = await import('esbuild')
  const out = await build({
    entryPoints: [join(C, 'index.ts')],
    bundle: true,
    format: 'esm',
    platform: 'node',
    write: false,
    logLevel: 'silent',
  })
  const tmp = join(tmpdir(), `verify-pack-${process.pid}.mjs`)
  writeFileSync(tmp, out.outputFiles[0].text)
  pack = (await import(pathToFileURL(tmp).href)).default
} catch {
  pack = null
}

// ---- 1. content filled ----------------------------------------------------
const projectTs = read(join(C, 'project.ts'))
if (/Northwind Components/.test(projectTs) || /Atlas Fasteners/.test(read(join(C, 'documents.ts')))) {
  warn('Content still contains the example project (Northwind / Atlas Fasteners). Replace it with this client.')
} else if (projectTs.trim()) {
  ok('Content pack has been customised away from the example.')
} else {
  fail('src/content/project.ts is missing or empty.')
}

// ---- 2. provenance links resolve ------------------------------------------
const docsTs = read(join(C, 'documents.ts'))
const defined = new Set()
const refs = new Set()
if (pack) {
  for (const d of pack.documents) {
    const r = d.render
    if (!r) continue
    for (const m of [...(r.meta ?? []), ...(r.footer ?? [])]) if (m.key) defined.add(m.key)
    for (const sec of r.sections ?? []) for (const f of sec.fields) if (f.key) defined.add(f.key)
    for (const row of r.table?.rows ?? []) for (const k of row.keys ?? []) if (k) defined.add(k)
    for (const b of d.image?.boxes ?? []) defined.add(b.fieldKey)
  }
  for (const f of pack.extracted ?? []) if (f.fieldKey) refs.add(f.fieldKey)
  for (const e of pack.exceptions ?? []) {
    if (e.fieldKey) refs.add(e.fieldKey)
    if (e.against?.fieldKey) refs.add(e.against.fieldKey)
  }
  for (const row of pack.comparison?.rows ?? []) for (const c of row.cells) if (c?.fieldKey) refs.add(c.fieldKey)
} else {
  for (const m of docsTs.matchAll(/\bkey:\s*'([^']+)'/g)) defined.add(m[1])
  // table cell keys: keys: ['a', null, 'b']
  for (const block of docsTs.matchAll(/keys:\s*\[([^\]]*)\]/g)) {
    for (const k of block[1].matchAll(/'([^']+)'/g)) defined.add(k[1])
  }
  for (const f of ['extracted.ts', 'exceptions.ts', 'comparison.ts']) {
    for (const m of read(join(C, f)).matchAll(/\bfieldKey:\s*'([^']+)'/g)) refs.add(m[1])
  }
}
const missing = [...refs].filter((k) => !defined.has(k))
if (!refs.size) warn('No fieldKey links found — highlighting on the Exceptions page may not fire.')
else if (missing.length) fail(`These fieldKeys have no matching key in documents.ts: ${missing.join(', ')}`)
else ok(`All ${refs.size} provenance links resolve to a document field.`)

// ---- 3. flow sanity --------------------------------------------------------
const flowTs = read(join(C, 'flow.ts'))
const laneCount = (flowTs.match(/id:\s*'(ours|system|human)'/g) || []).length
const edgeCount = (flowTs.match(/\bkind:\s*'(seq|down|up)'/g) || []).length
const hasSteps = /steps:\s*\[/.test(flowTs)
if (laneCount >= 2 && edgeCount >= 1 && hasSteps) ok(`Flow has ${laneCount} lane refs, ${edgeCount} edges, and steps.`)
else fail(`Flow looks thin (lanes=${laneCount}, edges=${edgeCount}, steps=${hasSteps}). The Process Flow page needs real content in src/content/flow.ts.`)

// ---- 3b. the client-only view exists, and is genuinely client-only ---------
const todayTs = read(join(C, 'flowToday.ts'))
if (!todayTs.trim()) {
  fail('src/content/flowToday.ts is missing. The Process Flow page opens on the CLIENT\'S OWN process, and that file is it.')
} else {
  const shapes = new Set([...todayTs.matchAll(/\bshape:\s*'([^']+)'/g)].map((m) => m[1]))
  const hasOurs = /lane:\s*'ours'/.test(todayTs)
  if (hasOurs) {
    fail('flowToday.ts contains a card on the `ours` lane. That view must show the client\'s own process with no step of ours anywhere in it.')
  } else if (shapes.size < 3) {
    warn(`flowToday.ts uses only ${shapes.size} flowchart symbols. That view carries its meaning by SHAPE, so it wants terminator, document, process, manual and decision.`)
  } else {
    ok(`Client-only flow reads as a flowchart (${shapes.size} symbol kinds, no step of ours).`)
  }
}

// ---- 3c. the two flows must describe the SAME process ---------------------
// The whole mechanic is: the client confirms his own line, then recognises it
// again with your layer on it. If "where we would help" quietly drops steps he
// just agreed to, that recognition never happens. Nothing else here catches
// it: each flow passes its own checks while the two tell different stories.
{
  // Phase titles only. A phase is the object carrying `lane:`, so take the first
  // title after each one. Lane definitions and step objects have no `lane:` key,
  // which keeps them out of the comparison.
  const phaseTitles = (src) =>
    [...src.matchAll(/lane:\s*'(?:ours|system|human)'[\s\S]{0,400}?title:\s*'((?:[^'\\]|\\.)*)'/g)]
      .map((m) => m[1])
  const STOP = new Set(['the', 'and', 'are', 'for', 'from', 'that', 'this', 'with', 'into', 'your',
    'you', 'its', 'it', 'is', 'was', 'a', 'an', 'of', 'on', 'in', 'to', 'by', 'or', 'not', 'no',
    'all', 'any', 'out', 'up', 'down', 'back', 'then', 'when', 'what', 'who', 'does', 'do', 'be'])
  const words = (t) => t.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/)
    .filter((w) => w.length >= 3 && !STOP.has(w))

  // A phase of theirs counts as covered if any distinctive word from its title
  // shows up anywhere in the titles or summaries of the other flow.
  const oursText = (flowTs.match(/\b(?:title|summary):\s*'((?:[^'\\]|\\.)*)'/g) || []).join(' ').toLowerCase()
  const theirs = phaseTitles(todayTs)
  const uncovered = theirs.filter((t) => {
    const w = words(t)
    return w.length > 0 && !w.some((x) => oursText.includes(x))
  })

  if (!theirs.length) {
    warn('Could not read any phase titles from flowToday.ts, so the two flows were not compared.')
  } else if (uncovered.length) {
    warn(
      `${uncovered.length} step(s) in flowToday.ts have no obvious counterpart in flow.ts: ` +
      uncovered.map((t) => `"${t}"`).join(', ') +
      '. "Where we would help" is meant to be the SAME line with your part marked, ' +
      'so a step of theirs that simply vanishes is usually a mistake. Keep it and recolour it, ' +
      'or say in the walkthrough why it is gone.',
    )
  } else {
    ok(`Both flows describe the same process (all ${theirs.length} of their steps appear in yours).`)
  }
}

// ---- 4. docIds resolve ------------------------------------------------------
let docIds = new Set([...docsTs.matchAll(/^\s{4}id:\s*'([^']+)'/gm)].map((m) => m[1]))
const usedDocIds = new Set()
if (pack) {
  docIds = new Set(pack.documents.map((d) => d.id))
  for (const f of pack.extracted ?? []) usedDocIds.add(f.docId)
  for (const e of pack.exceptions ?? []) {
    if (e.docId) usedDocIds.add(e.docId)
    if (e.against?.docId) usedDocIds.add(e.against.docId)
  }
  for (const c of pack.cases ?? []) for (const d of c.docs) usedDocIds.add(d.docId)
  for (const col of pack.comparison?.columns ?? []) usedDocIds.add(col.docId)
  for (const id of pack.project.mainDocs ?? []) usedDocIds.add(id)
  for (const it of pack.packList?.items ?? []) if (it.docId) usedDocIds.add(it.docId)
  // A live-run stage reads a document and highlights the keys it names: they must exist.
  for (const c of pack.cases ?? []) {
    for (const st of c.stages ?? []) {
      if (st.show && 'read' in st.show) {
        usedDocIds.add(st.show.read)
        const doc = pack.documents.find((d) => d.id === st.show.read)
        const have = new Set()
        const r = doc?.render
        for (const m of [...(r?.meta ?? []), ...(r?.footer ?? [])]) if (m.key) have.add(m.key)
        for (const sec of r?.sections ?? []) for (const f of sec.fields) have.add(f.key)
        for (const row of r?.table?.rows ?? []) for (const k of row.keys ?? []) if (k) have.add(k)
        const bad = st.show.keys.filter((k) => !have.has(k))
        if (bad.length) fail(`Stage "${st.id}" reads keys that are not in ${st.show.read}: ${bad.join(', ')}`)
      }
    }
  }
} else {
  for (const f of ['extracted.ts', 'exceptions.ts', 'intake.ts', 'comparison.ts']) {
    for (const m of read(join(C, f)).matchAll(/\bdocId:\s*'([^']+)'/g)) usedDocIds.add(m[1])
  }
  for (const m of read(join(C, 'project.ts')).matchAll(/mainDocs:\s*\[([^\]]*)\]/g)) {
    for (const k of m[1].matchAll(/'([^']+)'/g)) usedDocIds.add(k[1])
  }
}
const badDocIds = [...usedDocIds].filter((d) => !docIds.has(d))
if (!docIds.size) warn('Could not read any document ids from documents.ts.')
else if (badDocIds.length) fail(`These docIds do not exist in documents.ts: ${badDocIds.join(', ')}`)
else ok(`All ${usedDocIds.size} docId references resolve to a document.`)

// ---- 4b. every row that opens a finding points at a real one ---------------
{
  const exIds = pack
    ? new Set(pack.exceptions.map((e) => e.id))
    : new Set([...read(join(C, 'exceptions.ts')).matchAll(/^\s{4}id:\s*'([^']+)'/gm)].map((m) => m[1]))
  const used = new Set()
  if (pack) {
    for (const r of pack.comparison?.rows ?? []) if (r.exceptionId) used.add(r.exceptionId)
    for (const r of pack.schedule?.rows ?? []) if (r.exceptionId) used.add(r.exceptionId)
    for (const r of pack.loads?.rows ?? []) if (r.exceptionId) used.add(r.exceptionId)
    for (const l of pack.settlement?.lines ?? []) if (l.exceptionId) used.add(l.exceptionId)
    for (const it of pack.packList?.items ?? []) if (it.exceptionId) used.add(it.exceptionId)
  } else {
    for (const f of ['comparison.ts', 'schedule.ts']) {
      for (const m of read(join(C, f)).matchAll(/\bexceptionId:\s*'([^']+)'/g)) used.add(m[1])
    }
  }
  const bad = [...used].filter((id) => !exIds.has(id))
  if (bad.length) fail(`These exceptionIds do not match a finding in exceptions.ts: ${bad.join(', ')}`)
  else if (used.size) ok(`All ${used.size} row-to-finding links resolve.`)
}

// ---- 4c. an optional section that exists must also be wired in ------------
if (existsSync(join(C, 'comparison.ts')) && !/from '\.\/comparison'/.test(read(join(C, 'index.ts')))) {
  fail('src/content/comparison.ts exists but index.ts does not import it, so the Overview will not show it.')
}

// ---- 5. every guess has somewhere to be challenged -------------------------
const scheduleTs = read(join(C, 'schedule.ts'))
const guesses = [flowTs, todayTs, scheduleTs, read(join(C, 'comparison.ts'))].join('\n').match(/assumption:\s*true/g)?.length ?? 0
const questionsTs = read(join(C, 'questions.ts'))
const firstGroup = questionsTs.split(/\{\s*$/m)[0]
const firstGroupQs = (questionsTs.split(/id:\s*'/)[1] ?? '').split(/\n  \{/)[0]
const qCount = (firstGroupQs.match(/\bq:\s*'/g) || []).length + (firstGroupQs.match(/\bq:\s*\n/g) || []).length
if (!guesses) warn('Nothing on either flow is marked `assumption: true`. If the research really had no gaps that is fine, but it is rare. Guesses you admit to are what get corrected on the call.')
else if (qCount < 2) warn(`${guesses} cards carry a guess badge, but the first group of questions.ts has ${qCount} question(s). Every guess should be easy to challenge on the call.`)
else ok(`${guesses} guess badge(s) on the flows, with ${qCount} question(s) ready to challenge them.`)

// ---- 6. no long dashes in the content pack ---------------------------------
const dashHits = []
for (const name of readdirSync(C)) {
  if (!name.endsWith('.ts')) continue
  const body = read(join(C, name))
  const n = (body.match(/[\u2013\u2014]/g) || []).length
  if (n) dashHits.push(`${name} (${n})`)
}
if (dashHits.length) fail(`Em/en dashes found in the content pack: ${dashHits.join(', ')}. Use a comma, a full stop or a colon.`)
else ok('No em dashes or en dashes in the content pack.')

// ---- 7. summary PDF present -----------------------------------------------
function findPdf(dir, depth = 0) {
  if (depth > 2) return null
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.git' || name === 'dist') continue
    const p = join(dir, name)
    const s = statSync(p)
    if (s.isDirectory()) { const r = findPdf(p, depth + 1); if (r) return r }
    else if (name.toLowerCase().endsWith('.pdf')) return p
  }
  return null
}
const pdf = findPdf(ROOT)
if (pdf) ok(`Summary PDF found: ${pdf.replace(ROOT + '/', '')}`)
else warn('No summary PDF found. CLAUDE.md asks for a short walkthrough PDF at the end.')

// ---- 8. build output -------------------------------------------------------
if (existsSync(join(ROOT, 'dist', 'index.html'))) ok('Production build output exists (dist/).')
else warn('No dist/ build yet — run `npm run build` before delivery.')

// ---- 9. the password lock ---------------------------------------------------
{
  const acc = read(join(C, 'access.ts'))
  const field = (k) => acc.match(new RegExp(String.raw`${k}:\s*'([^']+)'`))?.[1]
  const created = field('createdOn')
  const expires = field('expiresOn')
  if (!acc) fail('src/content/access.ts is missing. Issue the password lock: npm run access -- --repo <github repo>.')
  else if (!created || !expires || !field('salt') || !field('check')) fail('src/content/access.ts is malformed. Re-issue it with npm run access.')
  else {
    const day = (iso) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d) }
    const span = Math.round((day(expires) - day(created)) / 86400000)
    const end = day(expires); end.setHours(23, 59, 59, 999)
    if (Date.now() > end.getTime()) fail(`The password lock expired on ${expires}. Re-issue it: npm run access -- --repo <github repo>.`)
    else if (span !== 14) warn(`The demo is open for ${span} days (${created} to ${expires}), not the usual 14.`)
    else ok(`Password lock issued: available ${created} to ${expires}.`)
    const client = read(join(C, 'project.ts')).match(/client:\s*'([^']+)'/)?.[1]
    if (client && field('preparedFor') !== client)
      fail(`The login page says "${field('preparedFor')}" but project.ts says "${client}". Re-issue the lock (npm run access) after editing project.ts.`)
    if (!/Northwind Components/.test(read(join(C, 'project.ts'))) && created === '2026-10-12' && expires === '2026-10-26')
      warn('access.ts still carries the kit example dates. Issue this demo its own lock with npm run access.')
  }
}

// ---- 10. the private suffix is nowhere in the project ----------------------
{
  let suffix = process.env.HEXAA_DEMO_SUFFIX?.trim()
  if (!suffix) suffix = read(join(homedir(), '.hexaa', 'demo-password-suffix')).trim()
  if (!suffix) warn('Could not scan for the password suffix: ~/.hexaa/demo-password-suffix is not on this machine.')
  else {
    const hits = []
    const scan = (dir, depth = 0) => {
      if (depth > 8) return
      for (const name of readdirSync(dir)) {
        if (name === 'node_modules' || name === '.git') continue
        const p = join(dir, name)
        const s = statSync(p)
        if (s.isDirectory()) scan(p, depth + 1)
        else if (s.size < 8_000_000 && readFileSync(p).includes(suffix)) hits.push(p.replace(ROOT, '.'))
      }
    }
    scan(ROOT)
    if (hits.length) fail(`hexaa's private password suffix is written in: ${hits.join(', ')}. Remove it before anything is pushed.`)
    else ok('The private password suffix appears in no project file (build output included).')
  }
}

// ---- report ----------------------------------------------------------------
console.log('\n  Pre-Sales Demo Kit — verification\n  ' + '-'.repeat(38))
for (const [level, msg] of results) {
  const tag = level === 'PASS' ? ' ✓ PASS' : level === 'WARN' ? ' ! WARN' : ' ✗ FAIL'
  console.log(`  ${tag}  ${msg}`)
}
const fails = results.filter((r) => r[0] === 'FAIL').length
const warns = results.filter((r) => r[0] === 'WARN').length
console.log('  ' + '-'.repeat(38))
console.log(`  ${fails} failed, ${warns} warnings\n`)
if (fails) {
  console.log('  → Fix the FAILs above, then re-run. Also do the semantic PDF check in CLAUDE.md.\n')
  process.exit(1)
}
console.log('  → Mechanical checks passed. Now do the semantic PDF check in CLAUDE.md.\n')
