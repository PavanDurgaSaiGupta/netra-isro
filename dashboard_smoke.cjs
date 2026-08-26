const { chromium } = require('playwright')

;(async () => {
  const browser = await chromium.launch({ channel: 'msedge' })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const errors = []

  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text().slice(0, 300))
  })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + String(e).slice(0, 300)))

  console.log('--- 1. Testing Landing Page (Default / Route) ---')
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle', timeout: 30000 })
  await page.waitForTimeout(3000)
  await page.screenshot({ path: '../shots/01-landing-hero.png' })

  // Scroll down to embedded 3D scene in landing view
  await page.evaluate(() => window.scrollBy(0, 850))
  await page.waitForTimeout(2000)
  await page.screenshot({ path: '../shots/02-landing-3d-scene.png' })

  // Scroll down to Kessler chart & stats
  await page.evaluate(() => window.scrollBy(0, 1100))
  await page.waitForTimeout(1500)
  await page.screenshot({ path: '../shots/03-landing-growth-stats.png' })

  console.log('--- 2. Testing Quick Launch Pill to 3D Cockpit ---')
  const enterBtn = await page.$('.landing-view__quick-btn--primary')
  if (enterBtn) {
    await enterBtn.click()
  } else {
    await page.goto('http://localhost:5173/tracking')
  }
  await page.waitForTimeout(3000)
  await page.screenshot({ path: '../shots/04-cockpit-default.png' })

  console.log('--- 3. Testing Google Earth Zoom & Orbit Controls ---')
  // Hover over canvas and perform mouse wheel zoom
  const canvas = await page.$('canvas')
  if (canvas) {
    const box = await canvas.boundingBox()
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      // Zoom in
      await page.mouse.wheel(0, -600)
      await page.waitForTimeout(1500)
      await page.screenshot({ path: '../shots/05-cockpit-zoomed-in-shadows.png' })

      // Zoom out
      await page.mouse.wheel(0, 800)
      await page.waitForTimeout(1200)
      await page.screenshot({ path: '../shots/06-cockpit-zoomed-out.png' })
    }
  }

  console.log('--- 4. Testing Camera Fly-To on Satellite Click ---')
  const sceneLabel = await page.$('.scene-label')
  if (sceneLabel) {
    try {
      await sceneLabel.click({ timeout: 4000 })
    } catch {
      await page.click('a[href="/catalog"]')
      await page.waitForTimeout(1000)
      await page.click('.catalog-table__row')
      await page.waitForTimeout(1000)
      await page.click('a[href="/tracking"]')
    }
  } else {
    await page.click('a[href="/catalog"]')
    await page.waitForTimeout(1000)
    await page.click('.catalog-table__row')
    await page.waitForTimeout(1000)
    await page.click('a[href="/tracking"]')
  }
  // Wait for GSAP 1.35s camera fly-to animation to complete
  await page.waitForTimeout(2000)
  await page.screenshot({ path: '../shots/07-cockpit-flyto-locked.png' })

  // Test RECENTER button in drawer
  const recenterBtn = await page.$('.sat-drawer__btn--secondary')
  if (recenterBtn) {
    await recenterBtn.click()
    await page.waitForTimeout(1500)
  }

  const closeBtn = await page.$('.sat-drawer__close-btn')
  if (closeBtn) await closeBtn.click()
  await page.waitForTimeout(600)

  console.log('--- 5. Testing TopBar Mode Switcher (OVERVIEW <-> CONSOLE) ---')
  const overviewTab = await page.$('.app-topbar__mode-tab:first-child')
  if (overviewTab) {
    await overviewTab.click()
    await page.waitForTimeout(1500)
    await page.screenshot({ path: '../shots/08-mode-switched-overview.png' })
  }

  console.log('CONSOLE ERRORS COUNT:', errors.length)
  errors.forEach((e) => console.log(' - ERROR:', e))

  await browser.close()
})()
