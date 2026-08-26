/* Headless smoke test: load page, capture console errors, scroll full page, screenshots. */
const { chromium } = require('playwright')

;(async () => {
  const browser = await chromium.launch({ channel: 'msedge' })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const errors = []
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text().slice(0, 300))
  })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + String(e).slice(0, 300)))

  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle', timeout: 45000 })
  await page.waitForTimeout(3500)
  await page.screenshot({ path: '../shots/01-hero.png' })

  // Scroll to orbit scene
  await page.evaluate(() => document.getElementById('orbit')?.scrollIntoView())
  await page.waitForTimeout(4000)
  await page.screenshot({ path: '../shots/02-orbit.png' })

  // Click on first telemetry row to test inspector modal
  const firstRow = await page.$('.telemetry__row')
  if (firstRow) {
    await firstRow.click()
    await page.waitForTimeout(1000)
    await page.screenshot({ path: '../shots/09-inspector-modal.png' })
    // Close modal
    const closeBtn = await page.$('.sat-modal__close-btn')
    if (closeBtn) await closeBtn.click()
    await page.waitForTimeout(500)
  }

  // Chart
  await page.evaluate(() => document.querySelector('.growth')?.scrollIntoView({ block: 'center' }))
  await page.waitForTimeout(2500)
  await page.screenshot({ path: '../shots/03-chart.png' })

  // Stats + program
  await page.evaluate(() => document.querySelector('.stats')?.scrollIntoView())
  await page.waitForTimeout(2200)
  await page.screenshot({ path: '../shots/04-stats.png' })

  await page.evaluate(() => document.getElementById('program')?.scrollIntoView())
  await page.waitForTimeout(2500)
  await page.screenshot({ path: '../shots/05-program.png' })

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await page.waitForTimeout(1500)
  await page.screenshot({ path: '../shots/06-footer.png' })

  // Tablet test (768x1024)
  await page.setViewportSize({ width: 768, height: 1024 })
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(1500)
  await page.screenshot({ path: '../shots/07-tablet-hero.png' })

  // Mobile test (375x812)
  await page.setViewportSize({ width: 375, height: 812 })
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(1500)
  await page.screenshot({ path: '../shots/08-mobile-hero.png' })

  console.log('CONSOLE ERRORS:', errors.length)
  errors.slice(0, 10).forEach((e) => console.log(' -', e))
  await browser.close()
})()
