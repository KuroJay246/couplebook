import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';

import { db } from '@/lib/firebase';
import {
  archiveMemory as archiveMemoryCore,
  convertPlanToMemory as convertPlanToMemoryCore,
  restoreMemory as restoreMemoryCore,
  saveMemory as saveMemoryCore,
  saveOwnProfile as saveOwnProfileCore,
  saveOwnSettings as saveOwnSettingsCore,
  savePlan as savePlanCore,
  saveSharedSettings as saveSharedSettingsCore,
  saveSpecialMomentText as saveSpecialMomentTextCore,
} from '@/services/firestore-writes-core.mjs';

function createContext(context: Record<string, unknown>) {
  return {
    ...context,
    firestore: context.firestore || db,
    createDoc: context.createDoc || doc,
    getDocument: context.getDocument || getDoc,
    setDocument: context.setDocument || setDoc,
    updateDocument: context.updateDocument || updateDoc,
    timestamp: context.timestamp || serverTimestamp,
  };
}

export async function saveOwnProfile(payload: Record<string, unknown>, context: Record<string, unknown>) {
  return saveOwnProfileCore(payload, createContext(context));
}

export async function saveOwnSettings(payload: Record<string, unknown>, context: Record<string, unknown>) {
  return saveOwnSettingsCore(payload, createContext(context));
}

export async function saveSharedSettings(payload: Record<string, unknown>, context: Record<string, unknown>) {
  return saveSharedSettingsCore(payload, createContext(context));
}

export async function saveMemory(memoryId: string, payload: Record<string, unknown>, context: Record<string, unknown>) {
  return saveMemoryCore(memoryId, payload, createContext(context));
}

export async function archiveMemory(memoryId: string, revision: number, context: Record<string, unknown>) {
  return archiveMemoryCore(memoryId, revision, createContext(context));
}

export async function restoreMemory(memoryId: string, revision: number, context: Record<string, unknown>) {
  return restoreMemoryCore(memoryId, revision, createContext(context));
}

export async function savePlan(planId: string, payload: Record<string, unknown>, context: Record<string, unknown>) {
  return savePlanCore(planId, payload, createContext(context));
}

export async function convertPlanToMemory(planId: string, plan: Record<string, unknown>, context: Record<string, unknown>) {
  return convertPlanToMemoryCore(planId, plan, createContext(context));
}

export async function saveSpecialMomentText(momentType: string, payload: Record<string, unknown>, context: Record<string, unknown>) {
  return saveSpecialMomentTextCore(momentType, payload, createContext(context));
}
