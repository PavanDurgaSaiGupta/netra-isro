import https from 'https'
import fs from 'fs'
import path from 'path'

const fontsDir = path.join(process.cwd(), 'public', 'fonts')
if (!fs.existsSync(fontsDir)) fs.mkdirSync(fontsDir, { recursive: true })

function fetchText(url, headers = {}) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        ...headers,
      }
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(fetchText(res.headers.location, headers))
      }
      let data = ''
      res.on('data', c => data += c)
      res.on('end', () => resolve(data))
      res.on('error', reject)
    }).on('error', reject)
  })
}

function fetchBinary(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      }
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(fetchBinary(res.headers.location))
      }
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => resolve(Buffer.concat(chunks)))
      res.on('error', reject)
    }).on('error', reject)
  })
}

const CSS_URL = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&family=Orbitron:wght@700;900&family=Space+Mono:wght@400;700&display=swap'

const css = await fetchText(CSS_URL)
console.log('CSS length:', css.length)

// Extract all woff2 + their unicode ranges + font-face blocks
const faceBlocks = [...css.matchAll(/@font-face\s*\{[^}]+\}/g)].map(m => m[0])
console.log('Font-face blocks found:', faceBlocks.length)

// Extract unique woff2 URLs
const woff2Urls = [...new Set([...css.matchAll(/url\((https:\/\/[^)]+\.woff2)\)/g)].map(m => m[1]))]
console.log('Unique woff2 URLs:', woff2Urls.length)

// Download each
const urlToLocal = {}
for (const url of woff2Urls) {
  const filename = url.split('/').pop().split('?')[0] // already has .woff2
  const localPath = path.join(fontsDir, filename)
  if (!fs.existsSync(localPath)) {
    console.log('Downloading:', filename)
    const buf = await fetchBinary(url)
    fs.writeFileSync(localPath, buf)
    console.log('  saved', buf.length, 'bytes')
  } else {
    console.log('  already exists:', filename)
  }
  urlToLocal[url] = `./${filename}`
}

// Generate local CSS
let localCss = css
for (const [url, local] of Object.entries(urlToLocal)) {
  localCss = localCss.replaceAll(url, local)
}

// Write as a CSS file
fs.writeFileSync(path.join(fontsDir, 'fonts.css'), localCss)
console.log('Written fonts.css with', Object.keys(urlToLocal).length, 'substitutions')
console.log('Done! Files in public/fonts/:')
fs.readdirSync(fontsDir).forEach(f => {
  const size = fs.statSync(path.join(fontsDir, f)).size
  console.log(' ', f, Math.round(size / 1024) + ' KB')
})
