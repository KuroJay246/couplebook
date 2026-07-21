import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { normalizeSpecialMomentPayload } from '../../src/data/legacySpecialMomentAdapter.js'

const repoRoot = path.resolve(process.cwd(), '..')
const sources = Object.freeze({
  birthday: path.join(repoRoot, 'pages', 'omnia-happy-birthday.html'),
  valentine: path.join(repoRoot, 'pages', 'valentine', 'index.html'),
  confession: path.join(repoRoot, 'pages', 'confession', 'index.html'),
})

function stripTags(value) {
  return String(value || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function decodeHtmlEntities(value) {
  return String(value || '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function extractTextByClass(html, className) {
  const escapedClass = className.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const pattern = new RegExp(`<([a-zA-Z0-9]+)[^>]*class=["'][^"']*\\b${escapedClass}\\b[^"']*["'][^>]*>([\\s\\S]*?)<\\/\\1>`, 'i')
  const match = html.match(pattern)
  return match ? decodeHtmlEntities(stripTags(match[2])) : ''
}

function extractTagText(html, tagName) {
  const pattern = new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'gi')
  return [...html.matchAll(pattern)].map((match) => decodeHtmlEntities(stripTags(match[1]))).filter(Boolean)
}

function section(id, kind, heading, content, items = []) {
  return { id, kind, heading, content, items }
}

function htmlToPayload(momentKey, html) {
  if (momentKey === 'birthday') {
    return {
      moment: {
        type: 'birthday',
        title: extractTextByClass(html, 'greeting'),
        subtitle: 'A private birthday chapter from the legacy book.',
        sections: [section('birthday-message', 'note', 'Birthday note', extractTextByClass(html, 'sub'))],
      },
      media: { status: 'none', type: null, note: 'No companion media is connected for this route.' },
    }
  }

  if (momentKey === 'valentine') {
    const headings = extractTagText(html, 'h2')
    return {
      moment: {
        type: 'valentine',
        title: headings[0] || '',
        subtitle: 'A private Valentine chapter from the legacy book.',
        sections: [
          section('valentine-question', 'paragraph', 'Private question', headings[0] || ''),
          section('valentine-response-options', 'list', 'Preserved response choices', '', extractTagText(html, 'button')),
          section('valentine-note', 'note', 'Legacy note', extractTextByClass(html, 'hint')),
        ],
      },
      media: { status: 'none', type: null, note: 'No companion media is connected for this route.' },
    }
  }

  if (momentKey === 'confession') {
    const headings = extractTagText(html, 'h1').concat(extractTagText(html, 'h2'), extractTagText(html, 'h3'))
    const paragraphs = extractTagText(html, 'p')
    return {
      moment: {
        type: 'confession',
        title: headings[0] || '',
        subtitle: 'A private confession chapter from the legacy book.',
        sections: [
          section('confession-opening', 'paragraph', headings[1] || 'Private opening', paragraphs[0] || ''),
          section('confession-message', 'note', headings[2] || 'Private note', extractTextByClass(html, 'message')),
        ],
      },
      media: {
        status: 'private-legacy-reference',
        type: null,
        note: 'Companion media remains private in the legacy book.',
      },
    }
  }

  return null
}

export function readNormalizedSpecialMoments() {
  const result = {}
  for (const [momentKey, sourcePath] of Object.entries(sources)) {
    if (!fs.existsSync(sourcePath)) {
      result[momentKey] = normalizeSpecialMomentPayload(momentKey, null)
      continue
    }
    result[momentKey] = normalizeSpecialMomentPayload(momentKey, htmlToPayload(momentKey, fs.readFileSync(sourcePath, 'utf8')))
  }
  return result
}
