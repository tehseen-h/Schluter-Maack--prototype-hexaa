/**
 * Gets the browser checks past the demo's login page, when there is one.
 *
 * The password is never typed on a command line. Give the company name and
 * the password is built here from hexaa's private suffix, read from the same
 * place `npm run access` reads it:
 *
 *   DEMO_COMPANY=dg-bevan-insurance node .../verify-flow.mjs
 *
 * (DEMO_PASSWORD=... also works, for a host app with some other password.)
 */
import { readFileSync, existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

function password() {
  if (process.env.DEMO_PASSWORD) return process.env.DEMO_PASSWORD
  const company = process.env.DEMO_COMPANY
  if (!company) return null
  let suffix = process.env.HEXAA_DEMO_SUFFIX?.trim()
  const file = join(homedir(), '.hexaa', 'demo-password-suffix')
  if (!suffix && existsSync(file)) suffix = readFileSync(file, 'utf8').trim()
  return suffix ? `${company}-${suffix}` : null
}

/** If the login page is showing, sign in. Returns true when it had to. */
export async function passLogin(page) {
  await page.waitForTimeout(300)
  if (!(await page.locator('#demo-password').count())) return false
  const pw = password()
  if (!pw)
    throw new Error(
      'The demo is behind its login page. Run with DEMO_COMPANY=<company-name> (the password is built from ~/.hexaa/demo-password-suffix).',
    )
  await page.fill('#demo-password', pw)
  await page.click('button[type=submit]')
  try {
    await page.waitForSelector('#demo-password', { state: 'detached', timeout: 8000 })
  } catch {
    throw new Error(`The login page refused the password for "${process.env.DEMO_COMPANY ?? 'DEMO_PASSWORD'}".`)
  }
  await page.waitForTimeout(800)
  return true
}

/** In the kit, Process Flow is a tab inside one page. Opens it, and the second view if VIEW=hexaa. */
export async function openProcessFlow(page) {
  const tab = page.getByRole('button', { name: /Process Flow/ }).first()
  if (await tab.count()) await tab.click()
  if (process.env.VIEW === 'hexaa') await page.getByText('Where we would help').first().click()
  await page.waitForSelector('.react-flow__node')
  await page.waitForTimeout(1200)
}
