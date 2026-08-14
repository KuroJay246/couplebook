import { freezeClone, toTrimmedString } from '../../data/adapterUtils.js'
import { getSpecialMomentConfig, isConfiguredSpecialMoment } from './specialMomentConfig.js'

function unavailableContent(config, status = 'unavailable') {
  return freezeClone({
    status,
    moment: null,
    media: {
      status: 'unavailable',
      type: null,
      note: config.unavailableMediaNote,
    },
    sourceStatus: {
      connection: status,
      source: 'legacy-local-dev',
      runtimeOnly: true,
      warningCount: 1,
    },
    privacy: {
      runtimeOnly: true,
      privateContentBundled: false,
    },
    warnings: [],
  })
}

export function buildSpecialMomentContentModel({ momentKey, contentSource = null, contentState = 'empty', contentError = '' } = {}) {
  const normalizedKey = toTrimmedString(momentKey).toLowerCase()
  const config = getSpecialMomentConfig(normalizedKey)

  if (!config || !isConfiguredSpecialMoment(normalizedKey)) {
    return freezeClone({
      config: null,
      status: 'invalid',
      moment: null,
      media: { status: 'unavailable', type: null, note: 'This special moment is not configured.' },
      sourceStatus: { connection: 'invalid', source: 'configuration', runtimeOnly: true, warningCount: 1 },
      privacy: { runtimeOnly: true, privateContentBundled: false },
      warnings: ['Unknown special moment route.'],
    })
  }

  if (contentState === 'loading') {
    return freezeClone({
      config,
      status: 'loading',
      moment: null,
      media: { status: 'unavailable', type: null, note: config.unavailableMediaNote },
      sourceStatus: { connection: 'loading', source: 'legacy-local-dev', runtimeOnly: true, warningCount: 0 },
      privacy: { runtimeOnly: true, privateContentBundled: false },
      warnings: [],
    })
  }

  if (contentState === 'error') {
    return freezeClone({
      config,
      ...unavailableContent(config, 'unavailable'),
      warnings: [toTrimmedString(contentError) || 'Special moment content could not be loaded safely.'],
    })
  }

  const source = contentSource || null
  const sourceData = source?.data || null
  const content = sourceData?.content || null
  const status = source?.status || sourceData?.status || 'unavailable'

  if (!content || !['ready', 'partial'].includes(status)) {
    return freezeClone({
      config,
      ...unavailableContent(config, status === 'invalid' ? 'invalid' : status === 'empty' ? 'empty' : 'unavailable'),
      warnings: Array.isArray(source?.warnings) ? source.warnings : [],
    })
  }

  return freezeClone({
    config,
    status,
    moment: {
      type: normalizedKey,
      title: content.title || config.title,
      subtitle: content.subtitle || config.runtimeSubtitle,
      date: content.date || null,
      revision: Number.isInteger(content.revision) && content.revision > 0 ? content.revision : 0,
      sections: Array.isArray(content.sections) ? content.sections : [],
    },
    media: sourceData?.media || {
      status: 'unavailable',
      type: null,
      note: config.unavailableMediaNote,
    },
    sourceStatus: sourceData?.sourceStatus || {
      connection: status,
      source: source?.source || 'legacy-local-dev',
      runtimeOnly: true,
      warningCount: Array.isArray(source?.warnings) ? source.warnings.length : 0,
    },
    privacy: sourceData?.privacy || {
      runtimeOnly: true,
      privateContentBundled: false,
    },
    warnings: Array.isArray(source?.warnings) ? source.warnings : [],
  })
}
