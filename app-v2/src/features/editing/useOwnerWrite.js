import { useCallback } from 'react'
import { useAuth } from '../../auth/useAuth.js'
import { readRuntimeEnv } from '../../data/adapterUtils.js'
import {
  acceptContract,
  archiveMemory,
  convertPlanToMemory,
  findExistingMediaDuplicate,
  removeVerifiedMediaFromMemory,
  restoreMemory,
  saveMemory,
  saveMemoryWithVerifiedMedia,
  saveOwnFavorites,
  saveOwnProfile,
  saveOwnSettings,
  savePlan,
  saveSpecialMomentText,
} from '../../services/firestoreWrites.js'

function createMemoryId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `memory_${crypto.randomUUID().replaceAll('-', '_')}`
  }

  return `memory_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

function createPlanId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `plan_${crypto.randomUUID().replaceAll('-', '_')}`
  }

  return `plan_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

export function useOwnerWrite(onRefresh) {
  const { approvedUser, user } = useAuth()

  const createContext = useCallback(() => ({
    approvedUser,
    env: readRuntimeEnv(),
    user,
  }), [approvedUser, user])

  const refresh = useCallback(async () => {
    if (typeof onRefresh === 'function') {
      await onRefresh()
    }
  }, [onRefresh])

  const runWrite = useCallback(async (write) => {
    const result = await write(createContext())
    await refresh()
    return result
  }, [createContext, refresh])

  return {
    canWrite: Boolean(user?.uid && approvedUser?.uid),
    approvedUser,
    user,
    createMemory: (payload) => {
      const memoryId = createMemoryId()
      return runWrite(async (context) => {
        await saveMemory(memoryId, payload, context)
        return memoryId
      })
    },
    createMemoryWithMedia: (payload, verifiedMedia) => {
      const memoryId = createMemoryId()
      return (async () => {
        const context = createContext()
        await saveMemoryWithVerifiedMedia(memoryId, payload, verifiedMedia, context)
        let refreshError = null
        try {
          await refresh()
        } catch (error) {
          refreshError = error
        }
        return { memoryId, refreshError, revision: 1, verifiedMedia }
      })()
    },
    finalizeMemoryWithMedia: (memoryId, payload, verifiedMedia) => (async () => {
      const context = createContext()
      await saveMemoryWithVerifiedMedia(memoryId, payload, verifiedMedia, context)
      let refreshError = null
      try {
        await refresh()
      } catch (error) {
        refreshError = error
      }
      return { memoryId, refreshError, revision: 1, verifiedMedia }
    })(),
    findExistingMediaDuplicate: (payload) => findExistingMediaDuplicate(payload, createContext()),
    updateMemory: (memoryId, payload) => runWrite((context) => saveMemory(memoryId, payload, context)),
    archiveMemory: (memoryId, revision = 0) => runWrite((context) => archiveMemory(memoryId, revision, context)),
    removeMemoryMedia: (memoryId, revision = 0) => (async () => {
      const context = createContext()
      const result = await removeVerifiedMediaFromMemory(memoryId, revision, context)
      let refreshError = null
      try {
        await refresh()
      } catch (error) {
        refreshError = error
      }
      return { ...result, refreshError }
    })(),
    restoreMemory: (memoryId, revision = 0) => runWrite((context) => restoreMemory(memoryId, revision, context)),
    createPlan: (payload) => {
      const planId = createPlanId()
      return runWrite(async (context) => {
        await savePlan(planId, payload, context)
        return planId
      })
    },
    updatePlan: (planId, payload) => runWrite((context) => savePlan(planId, payload, context)),
    convertPlanToMemory: (planId, plan) => runWrite((context) => convertPlanToMemory(planId, plan, context)),
    saveProfile: (payload) => runWrite((context) => saveOwnProfile(payload, context)),
    saveFavorites: (payload) => runWrite((context) => saveOwnFavorites(payload, context)),
    saveSettings: (payload) => runWrite((context) => saveOwnSettings(payload, context)),
    saveSpecialMoment: (momentType, payload) => runWrite((context) => saveSpecialMomentText(momentType, payload, context)),
    acceptContract: () => runWrite((context) => acceptContract(context)),
  }
}
