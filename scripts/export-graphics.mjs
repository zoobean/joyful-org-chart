#!/usr/bin/env node
// Renders the presentation graphics (see src/export) to PNG files, one per
// group, from Version 1:
//
//   pnpm export:graphics            # 2x: 1536x500, crisp in a 768x250 slot
//   pnpm export:graphics --scale=1  # 768x250
//   pnpm export:graphics sales cs   # only these groups
//
// Starts its own dev server and drives a headless Chromium over the DevTools
// protocol — nothing to install, but it does need one: it uses Playwright's
// cached chrome-headless-shell (or whatever CHROME_PATH points at). The
// pictures land in exports/group-graphics/, on a transparent background.

import { spawn } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'vite'
import { FRAME, GROUPS } from '../src/export/groups.js'

const args = process.argv.slice(2)
const scale = Number(args.find((a) => a.startsWith('--scale='))?.split('=')[1] ?? 2)
const wanted = args.filter((a) => !a.startsWith('--'))
const groups = wanted.length ? GROUPS.filter((g) => wanted.includes(g.id)) : GROUPS
const outDir = join(import.meta.dirname, '..', 'exports', 'group-graphics')

function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH
  const cache = join(homedir(), 'Library/Caches/ms-playwright')
  const shells = existsSync(cache)
    ? readdirSync(cache).filter((d) => d.startsWith('chromium_headless_shell-')).sort().reverse()
    : []
  for (const dir of shells) {
    for (const arch of ['chrome-headless-shell-mac-arm64', 'chrome-headless-shell-mac-x64']) {
      const bin = join(cache, dir, arch, 'chrome-headless-shell')
      if (existsSync(bin)) return bin
    }
  }
  throw new Error('No headless Chromium found. Set CHROME_PATH to a chrome-headless-shell binary.')
}

// Just enough of the DevTools protocol: send a command, await its reply.
function cdp(url) {
  const ws = new WebSocket(url)
  const pending = new Map()
  let next = 0
  ws.onmessage = ({ data }) => {
    const msg = JSON.parse(data)
    const waiter = pending.get(msg.id)
    if (!waiter) return
    pending.delete(msg.id)
    if (msg.error) waiter.reject(new Error(`${waiter.method}: ${msg.error.message}`))
    else waiter.resolve(msg.result)
  }
  const opened = new Promise((resolve, reject) => {
    ws.onopen = resolve
    ws.onerror = reject
  })
  const send = (method, params = {}, sessionId) =>
    new Promise((resolve, reject) => {
      const id = ++next
      pending.set(id, { resolve, reject, method })
      ws.send(JSON.stringify({ id, method, params, sessionId }))
    })
  return { opened, send, close: () => ws.close() }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function main() {
  await mkdir(outDir, { recursive: true })

  const server = await createServer({ logLevel: 'error' })
  await server.listen()
  const base = server.resolvedUrls.local[0]

  const chrome = spawn(
    findChrome(),
    ['--remote-debugging-port=0', '--hide-scrollbars', '--font-render-hinting=none'],
    { stdio: ['ignore', 'ignore', 'pipe'] }
  )
  const wsUrl = await new Promise((resolve, reject) => {
    let log = ''
    chrome.stderr.on('data', (chunk) => {
      log += chunk
      const m = log.match(/ws:\/\/\S+/)
      if (m) resolve(m[0])
    })
    chrome.on('exit', () => reject(new Error(`Chromium exited early:\n${log}`)))
  })

  const browser = cdp(wsUrl)
  await browser.opened
  try {
    for (const group of groups) {
      const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank' })
      const { sessionId } = await browser.send('Target.attachToTarget', { targetId, flatten: true })
      const page = (method, params) => browser.send(method, params, sessionId)

      // Without this the screenshot is painted on white.
      await page('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } })
      await page('Emulation.setDeviceMetricsOverride', {
        width: FRAME.width,
        height: FRAME.height,
        deviceScaleFactor: scale,
        mobile: false,
      })
      await page('Page.navigate', { url: `${base}?export=${group.id}` })

      let ready = false
      for (let i = 0; i < 150 && !ready; i++) {
        await sleep(200)
        const { result } = await page('Runtime.evaluate', {
          expression: 'window.__exportReady === true',
          returnByValue: true,
        })
        ready = result.value === true
      }
      if (!ready) throw new Error(`"${group.id}" never finished rendering`)

      // A graphic cut to its content reports its own size; the others are the
      // frame.
      const { result: sized } = await page('Runtime.evaluate', {
        expression: 'window.__exportSize',
        returnByValue: true,
      })
      const size = group.fit === 'content' ? sized.value : FRAME
      if (group.fit === 'content') {
        await page('Emulation.setDeviceMetricsOverride', {
          width: size.width,
          height: size.height,
          deviceScaleFactor: scale,
          mobile: false,
        })
        await sleep(300)
      }

      const { data } = await page('Page.captureScreenshot', { format: 'png' })
      const file = join(outDir, `${group.id}.png`)
      await writeFile(file, Buffer.from(data, 'base64'))
      console.log(`${group.id}: ${size.width * scale}x${size.height * scale} → ${file}`)
      await browser.send('Target.closeTarget', { targetId })
    }
  } finally {
    browser.close()
    chrome.kill()
    await server.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
