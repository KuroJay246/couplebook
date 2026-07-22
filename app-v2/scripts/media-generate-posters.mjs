/* global document, window */
import { Buffer } from 'node:buffer'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import {
  assertProject,
  buildMediaManifest,
  inventoryLocalMedia,
  readLegacyMediaReferences,
  REQUIRED_PROJECT_ID,
} from './lib/media-mapping.mjs'

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = path.resolve(appDir, '..')

function argValue(name) {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : ''
}

const projectId = argValue('--project')
assertProject(projectId)

if (process.argv.includes('--apply')) {
  throw new Error('Poster generation writes only local ignored files and does not accept --apply.')
}

const coupleId = argValue('--couple') || 'couple-main'
const outRoot = path.join(repoRoot, '.visual-audit', 'media-derived-current')
fs.mkdirSync(outRoot, { recursive: true })

const localMedia = inventoryLocalMedia({
  repoRoot,
  roots: [repoRoot, path.join(repoRoot, 'OUR MEMORIES'), path.join(repoRoot, 'assets'), path.join(repoRoot, 'pages')],
})
const references = readLegacyMediaReferences({ repoRoot })
const manifest = buildMediaManifest({ coupleId, localMedia, references })
const videoRecords = manifest.privateManifest.records.filter((record) => record.safeToUpload && record.expectedType === 'video')

async function extractPoster(page, record) {
  const outputDir = path.join(outRoot, record.mediaId)
  const outputPath = path.join(outputDir, 'poster.jpg')
  if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
    return { generated: 0, skippedExisting: 1 }
  }

  const dataUrl = await page.evaluate(async ({ src }) => {
    const video = document.createElement('video')
    video.muted = true
    video.preload = 'auto'
    video.src = src

    await new Promise((resolve, reject) => {
      const timeout = window.setTimeout(() => reject(new Error('video load timed out')), 10000)
      video.addEventListener('loadeddata', () => {
        window.clearTimeout(timeout)
        resolve()
      }, { once: true })
      video.addEventListener('error', () => {
        window.clearTimeout(timeout)
        reject(new Error('video decode failed'))
      }, { once: true })
    })

    const seekTarget = Number.isFinite(video.duration) && video.duration > 1 ? 0.75 : 0
    if (seekTarget > 0) {
      await new Promise((resolve) => {
        video.addEventListener('seeked', resolve, { once: true })
        video.currentTime = seekTarget
      })
    }

    const canvas = document.createElement('canvas')
    canvas.width = Math.min(960, video.videoWidth || 960)
    canvas.height = Math.max(1, Math.round(canvas.width * ((video.videoHeight || 540) / (video.videoWidth || 960))))
    const context = canvas.getContext('2d')
    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', 0.86)
  }, { src: pathToFileURL(record.privatePath).href })

  fs.mkdirSync(outputDir, { recursive: true })
  fs.writeFileSync(outputPath, Buffer.from(dataUrl.split(',')[1], 'base64'))
  return { generated: 1, skippedExisting: 0 }
}

const browser = await chromium.launch()
const page = await browser.newPage()
const totals = {
  failed: 0,
  failureReasons: {},
  generated: 0,
  projectLock: projectId === REQUIRED_PROJECT_ID ? 'PASS' : 'FAIL',
  skippedExisting: 0,
  videos: videoRecords.length,
}

for (const record of videoRecords) {
  try {
    const result = await extractPoster(page, record)
    totals.generated += result.generated
    totals.skippedExisting += result.skippedExisting
  } catch (error) {
    totals.failed += 1
    const rawReason = String(error?.message || 'unknown')
    const reason = rawReason.includes('video decode failed')
      ? 'video decode failed'
      : rawReason.replace(/file:\/\/\/[^ )]+/gi, 'file://[redacted]').split('\n')[0]
    totals.failureReasons[reason] = (totals.failureReasons[reason] || 0) + 1
  }
}

await browser.close()

process.stdout.write(JSON.stringify(totals, null, 2))
process.stdout.write('\n')
