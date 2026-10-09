const { chromium } = require('playwright')

;(async () => {
  console.log('--- Testing SPA Deep Route Direct Navigation ---')
  const browser = await chromium.launch({ channel: 'msedge', headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  const errors = []

  page.on('console', (m) => {
    if (m.type() === 'error' && !m.text().includes('celestrak')) {
      errors.push(`[Console Error] ${m.text()}`)
    }
  })
  page.on('pageerror', (e) => errors.push(`[PageError] ${String(e)}`))

  const routes = ['/tracking', '/catalog', '/debris', '/about', '/alerts']

  for (const route of routes) {
    const targetUrl = `http://localhost:5173/netra-isro${route}`
    console.log(`Testing direct navigation to: ${targetUrl}`)
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1000)

    const url = page.url()
    console.log(`✓ Resolved URL: ${url}`)
    if (!url.includes(route)) {
      errors.push(`Route ${route} did not resolve properly. Current URL: ${url}`)
    }
  }

  // Test simulated GitHub Pages 404 query redirect:
  console.log('Testing GitHub Pages SPA 404 query restoration (?/tracking)...')
  await page.goto('http://localhost:5173/netra-isro/?/tracking', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1000)
  const decodedUrl = page.url()
  console.log(`✓ Decoded URL from query redirect: ${decodedUrl}`)
  if (!decodedUrl.endsWith('/tracking')) {
    errors.push(`404 redirect did not restore clean URL path. Current: ${decodedUrl}`)
  }

  console.log('\n--- SPA TEST SUMMARY ---')
  console.log(`Errors: ${errors.length}`)
  if (errors.length > 0) {
    errors.forEach((e) => console.log('✗', e))
  } else {
    console.log('✓ All direct routes and SPA redirect restorations verified successfully!')
  }

  await browser.close()
  process.exit(errors.length > 0 ? 1 : 0)
})()
