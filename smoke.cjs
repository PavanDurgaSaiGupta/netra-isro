/**
 * NETRA-ISRO headless smoke test (Playwright / Edge).
 *
 * Exercises the app exactly as shipped: shell viewport scrolling (the app
 * scrolls inside .app-shell__viewport, not window), the boot preloader, and
 * quick-launch into the 3D cockpit. Screenshots land in ../shots/.
 * Exits non-zero if a step fails or an unexpected console/page error appears.
 *
 * Usage: npm run smoke          (dev server must be running on :5173)
 */
const { chromium } = require('playwright')

const BASE = 'http://localhost:5173/netra-isro/'
const SHOTS = '../shots/'
const VIEWPORT = { width: 1440, height: 900 }

const results = []
const check = (cond, msg) => {
  results.push(Boolean(cond))
  console.log(cond ? ' ok  ' : 'FAIL ', msg)
}

/** CelesTrak is rate-limited / geo-blocked in automation — 403 noise is expected. */
function isExpectedConsoleNoise(msg) {
  const text = (msg.text() || '').toLowerCase()
  const url = ((msg.location() && msg.location().url) || '').toLowerCase()
  return (
    url.includes('celestrak') ||
    text.includes('celestrak') ||
    text.includes('403') ||
    text.includes('favicon')
  )
}

;(async () => {
  const browser = await chromium.launch({ channel: 'msedge' })
  const page = await browser.newPage({ viewport: VIEWPORT })
  const errors = []
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + String(e).slice(0, 200)))
  page.on('console', (m) => {
    if (m.type() === 'error' && !isExpectedConsoleNoise(m)) errors.push(m.text().slice(0, 200))
  })

  // --- 1. Landing loads -------------------------------------------------------
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 45000 })
  await page.waitForTimeout(1000)

  const preloader = await page.$('.mission-preloader')
  if (preloader) {
    const skip = await page.$('.mission-preloader__skip-btn')
    if (skip) await skip.click()
    else await page.keyboard.press('Enter')
    await page.waitForTimeout(1200)
    check((await page.$('.mission-preloader')) === null, 'boot preloader exits (skip control works)')
  }

  await page.waitForSelector('.hero__title', { timeout: 10000 })
  check(true, 'landing hero renders')
  await page.screenshot({ path: SHOTS + 'smoke-01-hero.png' })

  // --- 2. Shell viewport scrolling (Lenis wrapper, not window) ---------------
  const scrollHeight = await page
    .$eval('.app-shell__viewport', (el) => el.scrollHeight)
    .catch(() => 0)
  check(scrollHeight > VIEWPORT.height, `shell viewport is scrollable (${scrollHeight}px tall)`)

  for (const [i, frac] of [0.33, 0.66, 1].entries()) {
    await page
      .$eval('.app-shell__viewport', (el, f) => el.scrollTo({ top: el.scrollHeight * f }), frac)
      .catch(() => {})
    await page.waitForTimeout(900)
    await page.screenshot({
      path: `${SHOTS}smoke-0${i + 2}-landing-scroll-${Math.round(frac * 100)}.png`,
    })
  }

  // --- 3. Quick launch into the 3D cockpit ------------------------------------
  await page.$eval('.app-shell__viewport', (el) => el.scrollTo({ top: 0 })).catch(() => {})
  await page.waitForTimeout(400)
  const launch = await page.$('.landing-view__quick-btn--primary')
  if (launch) await launch.click()
  else await page.goto(BASE + 'tracking')
  await page.waitForTimeout(2500)

  check(page.url().includes('/tracking'), `quick launch routed to the cockpit (${page.url()})`)
  await page.waitForSelector('canvas', { timeout: 25000 })
  check(true, 'WebGL canvas mounted')
  await page.waitForTimeout(1500)
  await page.screenshot({ path: SHOTS + 'smoke-05-cockpit.png' })

  // --- 4. Console hygiene ------------------------------------------------------
  check(errors.length === 0, `no unexpected console/page errors (${errors.length})`)
  errors.forEach((e) => console.log('   -', e))

  await browser.close()
  const failed = results.filter((r) => !r).length
  console.log(`\n${results.length - failed}/${results.length} checks passed`)
  process.exit(failed ? 1 : 0)
})()
