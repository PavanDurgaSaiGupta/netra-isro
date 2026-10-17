/* tests/e2e/xroute.cjs — committed Playwright probe for cross-route selection:
   catalog -> select -> navigate /tracking. Verifies the camera flies correctly
   into the pre-selected target instead of ending blind (smoke-08 case).
   Requires the dev server (npm run dev). Run: npm run test:xroute */
const { chromium } = require('playwright')
const path = require('path')

const BASE = 'http://localhost:5173/netra-isro/'
const SHOTS = path.join(__dirname, '..', '..', '..', 'shots')

;(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)))
  page.on('console', (m) => {
    if (m.type() === 'error' && !/celestrak|satnogs|cors|err_failed|favicon/i.test(m.text())) errors.push('[console] ' + m.text().slice(0, 160))
  })

  await page.goto(BASE + 'tracking', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1600)
  await page.keyboard.press('Enter')
  await page.waitForTimeout(300)
  await page.keyboard.press('Enter')
  await page.waitForTimeout(1300)
  await page.mouse.click(5, 5)
  await page.waitForTimeout(900)
  try {
    await page.locator('.earth-confirm-modal__btn-primary').waitFor({ state: 'visible', timeout: 8000 })
    await page.locator('.earth-confirm-modal__btn-primary').click({ timeout: 5000 })
  } catch {}
  await page.waitForTimeout(1500)

  console.log('cam after cockpit ready:', JSON.stringify(await page.evaluate(() => window.__NETRA_CAM?.())))

  // ---- go to catalog, select ISS row ----
  const nav = await page.$('a[href$="catalog"], a[href*="catalog"]')
  if (nav) await nav.click()
  await page.waitForTimeout(1800)
  await page.screenshot({ path: path.join(SHOTS, 'xroute-0-catalog.png') })

  // click the ISS row (drawer opens on catalog, cross-route state set)
  await page.locator('tbody tr', { hasText: 'ISS (ZARYA)' }).first().click({ timeout: 8000 })
  await page.waitForTimeout(900)
  const drawerOnCatalog = await page.$eval('.sat-drawer', (el) => el.className).catch(() => null)
  console.log('catalog drawer class:', drawerOnCatalog)

  // navigate back to /tracking
  const navTrack = await page.$('a[href$="tracking"], a[href*="tracking"]')
  await navTrack.click()
  await page.waitForTimeout(2600)
  const camRows = []
  for (let i = 0; i < 10; i++) {
    const c = await page.evaluate(() => (window.__NETRA_CAM ? window.__NETRA_CAM() : null))
    camRows.push(c ? c.cam.map((v) => v.toFixed(2)).join(',') + ' | t=' + c.tgt.map((v) => v.toFixed(2)).join(',') : 'HOOK-MISSING')
    await page.waitForTimeout(300)
  }
  console.log('--- /tracking after cross-route selection ---')
  camRows.forEach((r) => console.log('  ' + r))
  await page.screenshot({ path: path.join(SHOTS, 'xroute-1-tracking.png') })

  const chips = await page.$$eval('.sat-zoom-label', (els) =>
    els.map((el) => ({ t: (el.textContent || '').trim(), vis: el.style.display !== 'none', x: Math.round(el.getBoundingClientRect().x), y: Math.round(el.getBoundingClientRect().y) })),
  )
  console.log('labels:', JSON.stringify(chips))
  console.log('pageerrors:', JSON.stringify(errors.slice(0, 8)))
  await browser.close()
})().catch((e) => {
  console.error('PROBE FAILED:', e)
  process.exit(1)
})
