/* tests/e2e/flyto.cjs — committed Playwright probe for the fly-to (#11).
   Samples window.__NETRA_CAM (DEV hook in CameraController) after a marker
   click, plus the same-id re-click replay case, and takes full screenshots
   at rest points. Requires the dev server (npm run dev). Run: npm run test:flyto */
const { chromium } = require('playwright')
const path = require('path')

const BASE = 'http://localhost:5173/netra-isro/'
const SHOTS = path.join(__dirname, '..', '..', '..', 'shots')

;(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)))

  // ---- enter cockpit (preloader skip + modal auto path) ----
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
  await page.waitForTimeout(1800)

  const scanForMarker = async (xs, ys, step) => {
    for (let y = ys[0]; y <= ys[1]; y += step) {
      for (let x = xs[0]; x <= xs[1]; x += step) {
        await page.mouse.move(x, y)
        if ((await page.evaluate(() => document.body.style.cursor)) === 'pointer') return { x, y }
      }
    }
    return null
  }

  const sampleCam = async (n, ms, label) => {
    const rows = []
    for (let i = 0; i < n; i++) {
      const c = await page.evaluate(() => window.__NETRA_CAM ? window.__NETRA_CAM() : null)
      rows.push(c ? c.cam.map((v) => v.toFixed(2)).join(',') + ' | t=' + c.tgt.map((v) => v.toFixed(2)).join(',') : 'HOOK-MISSING')
      await page.waitForTimeout(ms)
    }
    console.log(`--- ${label} ---`)
    rows.forEach((r) => console.log('  ' + r))
    return rows
  }

  await page.screenshot({ path: path.join(SHOTS, 'flyto-0-default.png') })
  console.log('default cam:', JSON.stringify(await page.evaluate(() => window.__NETRA_CAM?.())))

  // ---- scan a marker on canvas ----
  const hit = await scanForMarker([100, 1180], [120, 640], 34)
  console.log('marker hit:', hit)
  if (!hit) {
    await scanForMarker([100, 1180], [80, 700], 20)
    console.log('rescan missing — aborting')
    await browser.close()
    process.exit(2)
  }
  // steady hover then click
  await page.mouse.move(hit.x + 200, hit.y + 150)
  await page.waitForTimeout(200)
  await page.mouse.move(hit.x, hit.y)
  await page.waitForTimeout(300)
  await page.screenshot({ path: path.join(SHOTS, 'flyto-1-hover.png'), clip: { x: hit.x - 160, y: hit.y - 110, width: 320, height: 240 } })

  await page.mouse.click(hit.x, hit.y)
  await sampleCam(14, 250, 'cam after CLICK #1 (tween 1.2s + follow)')
  await page.waitForTimeout(400)
  await page.screenshot({ path: path.join(SHOTS, 'flyto-2-after-click.png') })

  const chips = await page.$$eval('.sat-zoom-label', (els) =>
    els.map((el) => ({ t: (el.textContent || '').trim(), cls: el.className, vis: el.style.display !== 'none', rect: JSON.parse(JSON.stringify(el.getBoundingClientRect())) })),
  )
  console.log('labels:', JSON.stringify(chips))

  // ---- click the SAME marker again (same-id no-op suspicion) ----
  await page.mouse.click(hit.x, hit.y)
  await sampleCam(8, 250, 'cam after CLICK #2 same satellite')
  await page.waitForTimeout(400)
  await page.screenshot({ path: path.join(SHOTS, 'flyto-3-sameclick.png') })

  console.log('pageerrors:', JSON.stringify(errors))
  await browser.close()
})().catch((e) => {
  console.error('PROBE FAILED:', e)
  process.exit(1)
})
