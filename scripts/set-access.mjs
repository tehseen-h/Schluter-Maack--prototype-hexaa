#!/usr/bin/env node
/**
 * Issues the demo's password lock: writes src/content/access.ts.
 *
 *   npm run access -- --repo dg-bevan-insurance-prototype-hexaa
 *   npm run access -- --repo https://github.com/<owner>/dg-bevan-insurance-hexaa-prototype.git
 *   npm run access -- --company dg-bevan-insurance
 *
 * Options:
 *   --created YYYY-MM-DD   day the demo is issued (default: today)
 *   --days N               how long the password works (default: 14)
 *   --test <company>       check that access.ts opens with <company>-<suffix>
 *
 * The password is   <company>-<hexaa suffix>   e.g. dg-bevan-insurance-<suffix>.
 * <company> is the repo name with "-prototype-hexaa" or "-hexaa-prototype"
 * taken off the end. The suffix is hexaa's private part and lives ONLY on this
 * machine, outside every repo:
 *
 *   ~/.hexaa/demo-password-suffix      (or the HEXAA_DEMO_SUFFIX env variable)
 *
 * Nothing this script writes contains the password or the suffix: access.ts
 * holds a salted, slow, one-way check value (see src/lib/access.ts). The
 * script never prints the suffix either.
 */
import { pbkdf2Sync, randomBytes, createHash } from 'node:crypto'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'src', 'content', 'access.ts')
const SUFFIX_FILE = join(homedir(), '.hexaa', 'demo-password-suffix')
const ITERATIONS = 250_000

const die = (msg) => {
  console.error(`\n  ✗ ${msg}\n`)
  process.exit(1)
}

function readSuffix() {
  const fromEnv = process.env.HEXAA_DEMO_SUFFIX?.trim()
  if (fromEnv) return fromEnv
  if (existsSync(SUFFIX_FILE)) {
    const s = readFileSync(SUFFIX_FILE, 'utf8').trim()
    if (s) return s
  }
  die(
    `hexaa's private password suffix was not found.\n` +
      `    Put it in ${SUFFIX_FILE} (one line, nothing else),\n` +
      `    or set the HEXAA_DEMO_SUFFIX environment variable. Never put it in the project.`,
  )
}

/** "https://github.com/x/dg-bevan-insurance-prototype-hexaa.git" -> "dg-bevan-insurance" */
export function companyFromRepo(repo) {
  const name = repo
    .trim()
    .replace(/\/+$/, '')
    .replace(/\.git$/i, '')
    .split(/[/:]/)
    .pop()
    .toLowerCase()
  const m = name.match(/^(.+?)-(?:prototype-hexaa|hexaa-prototype)$/)
  if (!m) die(`"${name}" does not end in "-prototype-hexaa" or "-hexaa-prototype", so the company name cannot be read from it. Use --company instead.`)
  return m[1]
}

const parseArgs = (argv) => {
  const out = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (!a.startsWith('--')) continue
    const next = argv[i + 1]
    out[a.slice(2)] = next && !next.startsWith('--') ? (i++, next) : true
  }
  return out
}

const isoDay = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const addDays = (iso, n) => {
  const [y, m, d] = iso.split('-').map(Number)
  return isoDay(new Date(y, m - 1, d + n))
}
const normalise = (pw) => pw.trim().toLowerCase()
const checkFor = (password, expiresOn, salt, iterations) =>
  createHash('sha256')
    .update(pbkdf2Sync(`${normalise(password)}|${expiresOn}`, salt, iterations, 32, 'sha256'))
    .digest('base64')
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const args = parseArgs(process.argv.slice(2))
const suffix = readSuffix()

// ── --test: does the current access.ts open with this company's password? ──
if (args.test) {
  const company = String(args.test).toLowerCase()
  if (!existsSync(OUT)) die('src/content/access.ts does not exist yet.')
  const src = readFileSync(OUT, 'utf8')
  const field = (k) => src.match(new RegExp(`${k}:\\s*'([^']+)'`))?.[1]
  const iterations = Number(src.match(/iterations:\s*([\d_]+)/)?.[1].replace(/_/g, ''))
  const ok = checkFor(`${company}-${suffix}`, field('expiresOn'), Buffer.from(field('salt'), 'base64'), iterations) === field('check')
  console.log(ok ? `\n  ✓ access.ts opens with ${company}-<suffix>, until ${field('expiresOn')}.\n` : `\n  ✗ access.ts does NOT open with ${company}-<suffix>.\n`)
  process.exit(ok ? 0 : 1)
}

// ── issue ────────────────────────────────────────────────────────────────────
const company = args.repo ? companyFromRepo(String(args.repo)) : args.company ? String(args.company).toLowerCase() : null
if (!company) die('Say which company: --repo <github repo name or url> or --company <company-name>.')
if (!SLUG.test(company)) die(`"${company}" is not a valid company name: lowercase letters, digits and single hyphens only.`)

const createdOn = args.created ? String(args.created) : isoDay(new Date())
if (!/^\d{4}-\d{2}-\d{2}$/.test(createdOn)) die('--created must be YYYY-MM-DD.')
const days = args.days ? Number(args.days) : 14
if (!Number.isInteger(days) || days < 1) die('--days must be a whole number of days.')
const expiresOn = addDays(createdOn, days)

// The login page shows who it is for and what it is, but must not pull in the
// content pack to do it, so the two lines it needs are copied in here.
const projectSrc = readFileSync(join(ROOT, 'src', 'content', 'project.ts'), 'utf8')
// a single-quoted string field, escapes and all
const str = (key) => {
  const m = projectSrc.match(new RegExp(String.raw`\b${key}:\s*'((?:\\.|[^'\\])*)'`))
  return m ? m[1].replace(/\\(.)/g, '$1') : null
}
const preparedFor = str('client')
const about = str('subtitle')
if (!preparedFor || !about) die('Could not read client and subtitle from src/content/project.ts. Fill project.ts first.')
const q = (s) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`

const salt = randomBytes(16)
const check = checkFor(`${company}-${suffix}`, expiresOn, salt, ITERATIONS)

writeFileSync(
  OUT,
  `import type { Access } from '../lib/access'

// The demo's password lock. GENERATED by \`npm run access\`, do not edit by hand.
//
// There is no password in here, only a one-way check value. The expiry date is
// part of what was hashed, so changing a date breaks the password rather than
// extending it: re-run \`npm run access\` to issue the demo again.
export const access: Access = {
  preparedFor: ${q(preparedFor)},
  about: ${q(about)},
  createdOn: '${createdOn}',
  expiresOn: '${expiresOn}',
  iterations: ${ITERATIONS.toLocaleString('en-US').replace(/,/g, '_')},
  salt: '${salt.toString('base64')}',
  check: '${check}',
}
`,
)

const masked = `${company}-${'•'.repeat(suffix.length)}`
console.log(`
  ✓ Password lock issued (src/content/access.ts)
    Prepared for:    ${preparedFor}
    Password:        ${masked}   (company + hexaa's private suffix)
    Available from:  ${createdOn}
    Available till:  ${expiresOn}  (${days} days, end of that day)
`)
