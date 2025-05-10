import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type GlobalSettings = {
  fingerOperations: boolean
  wheelZoom: boolean
}

export const useGlobalSettings = create<GlobalSettings>()(
  persist((_set) => ({
    fingerOperations: false,
    wheelZoom: false,
  }), {
    name: 'cpaint',
  }));
