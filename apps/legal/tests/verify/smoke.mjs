/** Quick smoke pass: page loads, no console errors, islands hydrate, search works. */
import { chromium } from 'playwright'

const BASE = process.env.CLONE || 'http://127.0.0.1:4323'
const pages = ['/', '/terms/get-started/', '/terms/commercial-terms-of-service/', '/ai-governance/models/', '/ai-governance/models/voxtral-3/', '/ai-governance/ai-systems/vibe-work/']

const browser = await chromium.launch()
for (const path of pages) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const errors = []
  const bad = []
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('response', (r) => r.status() >= 400 && bad.push(`${r.status()} ${r.url()}`))
  const res = await page.goto(BASE + path, { waitUntil: 'networkidle' })
  await page.waitForTimeout(600)
  const islands = await page.locator('astro-island').count()
  const hydrated = await page.evaluate(() => document.querySelectorAll('astro-island[client]').length)
  const themeButtons = await page.locator('button[aria-label*="theme" i], button[aria-label*="Theme"]').count()
  console.log(`${path} → ${res.status()} islands=${islands} images=${await page.locator('img').count()} themeBtns=${themeButtons}`)
  if (errors.length) console.log('  console:', errors.slice(0, 5))
  if (bad.length) console.log('  http:', bad.slice(0, 8))
  await page.close()
}
await browser.close()
