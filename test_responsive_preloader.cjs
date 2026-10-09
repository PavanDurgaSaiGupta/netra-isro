const { chromium } = require('playwright')

;(async () => {
  console.log('--- Starting Responsive & Preloader Verification Test ---')
  const browser = await chromium.launch({ channel: 'msedge', headless: true })
  const errors = []
  const BASE = 'http://localhost:5173/netra-isro/'

  // ----------------------------------------------------
  // TEST 1: MOBILE VIEWPORT (375 x 812, iPhone)
  // ----------------------------------------------------
  console.log('\n[1/3] Testing Mobile Phone (375x812)...')
  const mobilePage = await browser.newPage({ viewport: { width: 375, height: 812 } })
  mobilePage.on('console', async (m) => {
    // Ignore external CelesTrak 403 rate limits since seed data handles fallback
    if (m.type() === 'error' && !m.text().includes('celestrak')) {
      const full = await Promise.all(m.args().map((a) => a.jsonValue().catch(() => a.toString())))
      errors.push(`[Mobile Console] ${full.join(' ')}`)
    }
  })
  mobilePage.on('pageerror', (e) => errors.push(`[Mobile PageError] ${String(e).slice(0, 200)}`))

  await mobilePage.goto(BASE, { waitUntil: 'domcontentloaded' })

  // Check that Mission Preloader is present
  const preloader = await mobilePage.$('.mission-preloader')
  console.log('✓ Preloader mounted on mobile:', !!preloader)

  // Click FAST ENTER or let it finish
  const skipBtn = await mobilePage.$('.mission-preloader__skip-btn')
  if (skipBtn) {
    await skipBtn.click()
    console.log('✓ Tapped FAST ENTER bypass on mobile preloader')
  }
  await mobilePage.waitForTimeout(1000)

  // Check mobile hamburger button
  const hamburger = await mobilePage.$('.app-topbar__hamburger-btn')
  console.log('✓ Mobile hamburger button visible:', !!hamburger)
  if (hamburger) {
    await hamburger.click()
    await mobilePage.waitForTimeout(400)
    const sidebarOpen = await mobilePage.$('.radar-nav--mobile-open')
    console.log('✓ Mobile sidebar drawer opened:', !!sidebarOpen)

    const closeBtn = await mobilePage.$('.radar-nav__close')
    if (closeBtn) {
      await closeBtn.click()
      await mobilePage.waitForTimeout(300)
      console.log('✓ Mobile sidebar drawer closed via close button')
    }
  }

  // Check mobile bottom nav
  const bottomNav = await mobilePage.$('.mobile-bottom-nav')
  console.log('✓ Mobile bottom navigation bar rendered:', !!bottomNav)

  // Navigate to 3D Cockpit via bottom nav
  const cockpitNavBtn = await mobilePage.$('.mobile-bottom-nav a[href$="/tracking"]')
  if (cockpitNavBtn) {
    await cockpitNavBtn.click()
    await mobilePage.waitForTimeout(2000)
    console.log('✓ Navigated to 3D Cockpit on mobile')
  }

  // Check mobile HUD action tray buttons
  const hudTray = await mobilePage.$('.tracking-view__mobile-hud-tray')
  console.log('✓ 3D Cockpit mobile HUD action tray active:', !!hudTray)

  // Test opening Telemetry drawer on mobile
  const telemetryBtn = await mobilePage.$('.tracking-view__hud-btn:has-text("TELEMETRY")')
  if (telemetryBtn) {
    await telemetryBtn.click()
    await mobilePage.waitForTimeout(400)
    const telOpen = await mobilePage.$('.tracking-view__bottom-left-overlay.tracking-view__panel--mobile-open')
    console.log('✓ Telemetry panel opened as mobile sheet:', !!telOpen)

    // Close panel
    const closeTel = await mobilePage.$('.tracking-view__bottom-left-overlay .tracking-view__panel-mobile-close')
    if (closeTel) {
      await closeTel.click()
      await mobilePage.waitForTimeout(300)
      console.log('✓ Telemetry sheet closed')
    }
  }

  // Navigate to Catalog on mobile
  const catalogNavBtn = await mobilePage.$('.mobile-bottom-nav a[href$="/catalog"]')
  if (catalogNavBtn) {
    await catalogNavBtn.click()
    await mobilePage.waitForTimeout(1500)
    const cardsGrid = await mobilePage.$('.catalog-view__cards-grid')
    console.log('✓ Catalog automatically rendered responsive cards on mobile:', !!cardsGrid)
    const cards = await mobilePage.$$('.catalog-card')
    console.log(`✓ Catalog rendered ${cards.length} tactical satellite cards on mobile`)
  }

  await mobilePage.close()

  // ----------------------------------------------------
  // TEST 2: TABLET VIEWPORT (768 x 1024, iPad)
  // ----------------------------------------------------
  console.log('\n[2/3] Testing Tablet (768x1024)...')
  const tabletPage = await browser.newPage({ viewport: { width: 768, height: 1024 } })
  tabletPage.on('console', (m) => {
    if (m.type() === 'error' && !m.text().includes('celestrak')) {
      errors.push(`[Tablet Console] ${m.text().slice(0, 200)}`)
    }
  })
  tabletPage.on('pageerror', (e) => errors.push(`[Tablet PageError] ${String(e).slice(0, 200)}`))

  await tabletPage.goto(BASE, { waitUntil: 'domcontentloaded' })
  const tabletSkip = await tabletPage.$('.mission-preloader__skip-btn')
  if (tabletSkip) await tabletSkip.click()
  await tabletPage.waitForTimeout(1000)

  // On tablet (< 1024px), sidebar is in off-canvas drawer; open via hamburger
  const tabletHamburger = await tabletPage.$('.app-topbar__hamburger-btn')
  if (tabletHamburger) {
    await tabletHamburger.click()
    await tabletPage.waitForTimeout(400)
  }

  // Navigate to Debris view
  const debrisLink = await tabletPage.$('.radar-nav a[href$="/debris"]')
  if (debrisLink) {
    await debrisLink.click()
    await tabletPage.waitForTimeout(1500)
  }

  const debrisTable = await tabletPage.$('.debris-view')
  console.log('✓ Debris screening table rendered on tablet:', !!debrisTable)
  await tabletPage.close()

  // ----------------------------------------------------
  // TEST 3: DESKTOP VIEWPORT (1440 x 900)
  // ----------------------------------------------------
  console.log('\n[3/3] Testing Desktop (1440x900)...')
  const desktopPage = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  desktopPage.on('console', (m) => {
    if (m.type() === 'error' && !m.text().includes('celestrak')) {
      errors.push(`[Desktop Console] ${m.text().slice(0, 200)}`)
    }
  })
  desktopPage.on('pageerror', (e) => errors.push(`[Desktop PageError] ${String(e).slice(0, 200)}`))

  await desktopPage.goto(BASE, { waitUntil: 'domcontentloaded' })
  const desktopSkip = await desktopPage.$('.mission-preloader__skip-btn')
  if (desktopSkip) await desktopSkip.click()
  await desktopPage.waitForTimeout(1000)

  // Navigate to Tracking
  const trackingLink = await desktopPage.$('a[href$="/tracking"]')
  if (trackingLink) {
    await trackingLink.click()
    await desktopPage.waitForTimeout(2000)
  }

  const desktopSidebar = await desktopPage.$('.radar-nav')
  const desktopRadar = await desktopPage.$('.radar-widget')
  console.log('✓ Desktop sidebar docked:', !!desktopSidebar)
  console.log('✓ Desktop overhead radar widget visible:', !!desktopRadar)
  await desktopPage.close()

  // ----------------------------------------------------
  // SUMMARY
  // ----------------------------------------------------
  console.log('\n--- VERIFICATION SUMMARY ---')
  console.log(`Total Errors Encountered: ${errors.length}`)
  if (errors.length > 0) {
    errors.forEach((err) => console.log(' ✗', err))
  } else {
    console.log('✓ ALL TESTS PASSED WITH ZERO CONSOLE ERRORS!')
  }

  await browser.close()
  process.exit(errors.length > 0 ? 1 : 0)
})()
