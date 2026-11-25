import { chromium } from 'playwright'
import fs from 'node:fs/promises'

const url = process.argv[2]
const out = process.argv[3]
const width = Number(process.argv[4] ?? 1440)
const scheme = process.argv[5] ?? 'light'
const full = process.argv[6] !== 'viewport'

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: scheme, deviceScaleFactor: 1 })
const page = await ctx.newPage()
await page.goto(url, { waitUntil: 'networkidle', timeout: 120000 })
await page.waitForTimeout(2500)
await fs.mkdir(out.replace(/\/[^/]+$/, ''), { recursive: true })
await page.screenshot({ path: out, fullPage: full })
console.log('shot', out, await page.evaluate(() => ({ h: document.documentElement.scrollHeight, w: innerWidth })))
await browser.close()
