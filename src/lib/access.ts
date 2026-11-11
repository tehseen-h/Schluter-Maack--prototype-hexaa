/**
 * The password lock in front of the demo.
 *
 * WHAT IS (AND IS NOT) IN THE CODE
 * The password itself is never stored anywhere in the project, the repo or the
 * built site. `src/content/access.ts` holds only a one-way check value, made by
 * `npm run access` on the machine that holds hexaa's private suffix:
 *
 *   key   = PBKDF2-SHA256( password + "|" + expiresOn, salt, iterations )
 *   check = SHA-256( key )
 *
 * Typing the right password re-derives `key`, and its SHA-256 has to equal
 * `check`. The expiry date is part of what is hashed, so moving the date in
 * access.ts breaks the password instead of extending it: only someone who
 * knows the password can re-issue the demo for longer.
 *
 * STAYING LOGGED IN
 * After a correct password the derived `key` (not the password) is kept in
 * localStorage. On every load its SHA-256 is compared with `check`, which
 * takes a millisecond, so a reload or a reopened browser goes straight in,
 * until the end of `expiresOn`. A value cannot be forged from the code alone,
 * because `key` can only be derived from the password.
 *
 * LIMIT: this is a lock on the front door of a static site, not a vault. The
 * demo's own text ships in the site's JavaScript (in a chunk that is only
 * fetched after unlocking), so a determined technical visitor could read it.
 * The password, and hexaa's suffix, they cannot.
 */

export interface Access {
  /** The client, as on the login page. Copied from project.ts when issued. */
  preparedFor: string
  /** One line on what the demo shows. Copied from project.ts subtitle. */
  about: string
  /** Day the demo was issued, YYYY-MM-DD. */
  createdOn: string
  /** Last day the password works, YYYY-MM-DD, inclusive. */
  expiresOn: string
  iterations: number
  /** base64, random per project */
  salt: string
  /** base64 SHA-256 of the derived key */
  check: string
}

const enc = new TextEncoder()

const b64 = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf)))
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))

/** People type it with stray spaces or a capital first letter. */
export const normalisePassword = (pw: string) => pw.trim().toLowerCase()

/** Local end of the last day: "available till 26 Oct" means all of 26 Oct. */
export function expiryMoment(a: Access): Date {
  const [y, m, d] = a.expiresOn.split('-').map(Number)
  return new Date(y, m - 1, d, 23, 59, 59, 999)
}

export const isExpired = (a: Access, now = new Date()) => now.getTime() > expiryMoment(a).getTime()

/** Whole days left after today: 14 on the day it is issued, 0 on the last day. */
export function daysLeft(a: Access, now = new Date()): number {
  const end = expiryMoment(a)
  if (now > end) return 0
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime() - today.getTime()) / 86400000)
}

export function formatDay(iso: string, style: 'long' | 'short' = 'long'): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: style === 'long' ? 'long' : 'short',
    year: 'numeric',
  })
}

async function sha256b64(bytes: BufferSource): Promise<string> {
  return b64(await crypto.subtle.digest('SHA-256', bytes))
}

async function deriveKey(a: Access, password: string): Promise<ArrayBuffer> {
  const base = await crypto.subtle.importKey('raw', enc.encode(`${normalisePassword(password)}|${a.expiresOn}`), 'PBKDF2', false, [
    'deriveBits',
  ])
  return crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: unb64(a.salt), iterations: a.iterations }, base, 256)
}

// One key per issued demo, so two demos on the same domain never share a login.
const storageKey = (a: Access) => `hexaa-demo-access:${a.check.slice(0, 16)}`

function readStored(a: Access): string | null {
  try {
    return localStorage.getItem(storageKey(a))
  } catch {
    return null
  }
}

/** True when this browser already unlocked this demo and it has not expired. */
export async function hasSession(a: Access): Promise<boolean> {
  if (isExpired(a) && !import.meta.env.DEV) return false
  const stored = readStored(a)
  if (!stored) return false
  try {
    return (await sha256b64(unb64(stored))) === a.check
  } catch {
    return false
  }
}

/** Checks the password and, if right, remembers this browser. */
export async function unlock(a: Access, password: string): Promise<boolean> {
  if (!password.trim()) return false
  const key = await deriveKey(a, password)
  if ((await sha256b64(key)) !== a.check) return false
  try {
    localStorage.setItem(storageKey(a), b64(key))
  } catch {
    /* storage blocked: unlocked for this page only */
  }
  return true
}

/** Forget this browser and show the lock again. */
export function lock(a: Access) {
  try {
    localStorage.removeItem(storageKey(a))
  } catch {
    /* nothing stored */
  }
}
