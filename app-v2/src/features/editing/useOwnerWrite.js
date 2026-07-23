import { useCallback } from 'react'
import { useAuth } from '../../auth/useAuth.js'
import {
  acceptContract,
  archiveMemory,
  saveMemory,
  saveOwnFavorites,
  saveOwnProfile,
  saveOwnSettings,
  saveSpecialMomentText,
} from '../../services/firestoreWrites.js'

function createMemoryId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `memory_${crypto.randomUUID().replaceAll('-', '_')}`
  }

  return `memory_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

export function useOwnerWrite(onRefresh) {
  const { approvedUser, user } = useAuth()

  const createContext = useCallback(() => ({
    approvedUser,
    env: import.meta.env,
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
    updateMemory: (memoryId, payload) => runWrite((context) => saveMemory(memoryId, payload, context)),
    archiveMemory: (memoryId) => runWrite((context) => archiveMemory(memoryId, context)),
    saveProfile: (payload) => runWrite((context) => saveOwnProfile(payload, context)),
    saveFavorites: (payload) => runWrite((context) => saveOwnFavorites(payload, context)),
    saveSettings: (payload) => runWrite((context) => saveOwnSettings(payload, context)),
    saveSpecialMoment: (momentType, payload) => runWrite((context) => saveSpecialMomentText(momentType, payload, context)),
    acceptContract: () => runWrite((context) => acceptContract(context)),
  }
}
