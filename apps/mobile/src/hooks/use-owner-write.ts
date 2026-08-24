import { useCallback } from 'react';

import { useAuth } from '@/hooks/use-auth';
import {
  archiveMemory,
  convertPlanToMemory,
  restoreMemory,
  saveMemory,
  saveOwnProfile,
  saveOwnSettings,
  savePlan,
  saveSharedSettings,
} from '@/services/firestore-writes';

function createMemoryId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `memory_${crypto.randomUUID().replaceAll('-', '_')}`;
  }

  return `memory_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function createPlanId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `plan_${crypto.randomUUID().replaceAll('-', '_')}`;
  }

  return `plan_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function readWriteEnv() {
  return {
    EXPO_PUBLIC_FIREBASE_WRITE_MODE: process.env.EXPO_PUBLIC_FIREBASE_WRITE_MODE ?? '',
    NODE_ENV: process.env.NODE_ENV ?? 'development',
  };
}

export function useOwnerWrite() {
  const { approvedUser, user } = useAuth();

  const createContext = useCallback(
    () => ({
      approvedUser,
      env: readWriteEnv(),
      user,
    }),
    [approvedUser, user],
  );

  return {
    canWrite: Boolean(user?.uid && approvedUser?.uid),
    createMemory: async (payload: Record<string, unknown>) => {
      const memoryId = createMemoryId();
      await saveMemory(memoryId, payload, createContext());
      return memoryId;
    },
    updateMemory: (memoryId: string, payload: Record<string, unknown>) =>
      saveMemory(memoryId, payload, createContext()),
    archiveMemory: (memoryId: string, revision: number) =>
      archiveMemory(memoryId, revision, createContext()),
    restoreMemory: (memoryId: string, revision: number) =>
      restoreMemory(memoryId, revision, createContext()),
    createPlan: async (payload: Record<string, unknown>) => {
      const planId = createPlanId();
      await savePlan(planId, payload, createContext());
      return planId;
    },
    updatePlan: (planId: string, payload: Record<string, unknown>) =>
      savePlan(planId, payload, createContext()),
    convertPlanToMemory: (planId: string, plan: Record<string, unknown>) =>
      convertPlanToMemory(planId, plan, createContext()),
    saveProfile: (payload: Record<string, unknown>) =>
      saveOwnProfile(payload, createContext()),
    saveOwnSettings: (payload: Record<string, unknown>) =>
      saveOwnSettings(payload, createContext()),
    saveSharedSettings: (payload: Record<string, unknown>) =>
      saveSharedSettings(payload, createContext()),
  };
}
