// Usage: node capture.mjs full            -> work/frames/f%05d.jpg (every frame)
//        node capture.mjs stills 1.2 5.5   -> work/stills/s_<t>.jpg (steps through all frames, shoots only these)
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const puppeteer = require('./tools/node_modules/puppeteer-core')

const FPS = 30
const mode = process.argv[2] ?? 'stills'
const stills = process.argv.slice(3).map(Number)
const outDir = path.resolve(mode === 'full' ? 'frames' : 'stills')
fs.mkdirSync(outDir, { recursive: true })

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--force-device-scale-factor=1', '--hide-scrollbars', '--font-render-hinting=none'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 })
page.on('console', (m) => (m.type() === 'warning' || m.type() === 'error') && console.log('[page]', m.text()))
await page.goto('http://localhost:5199/brag-output/work/video/index.html', { waitUntil: 'networkidle0' })
await page.waitForFunction('typeof window.renderFrame === "function"')
const info = await page.evaluate(() => window.VIDEO)
console.log(JSON.stringify(info))
fs.writeFileSync('timeline.json', JSON.stringify(info))

const total = Math.round(info.DURATION * FPS)
const lastStill = stills.length ? Math.max(...stills) : 0
const end = mode === 'full' ? total : Math.ceil(lastStill * FPS) + 1
const want = new Set(stills.map((s) => Math.round(s * FPS)))
const t0 = Date.now()
for (let f = 0; f < end; f++) {
  const t = f / FPS
  await page.evaluate((t) => window.renderFrame(t), t)
  if (mode === 'full') {
    await page.screenshot({ path: path.join(outDir, `f${String(f).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 95 })
    if (f % 60 === 0) console.log(`frame ${f}/${total} ${((Date.now() - t0) / 1000).toFixed(0)}s`)
  } else if (want.has(f)) {
    await page.screenshot({ path: path.join(outDir, `s_${t.toFixed(2)}.jpg`), type: 'jpeg', quality: 90 })
  }
}
await browser.close()
console.log('done', ((Date.now() - t0) / 1000).toFixed(0) + 's')
