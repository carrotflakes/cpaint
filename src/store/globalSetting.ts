import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type GlobalSettings = {
  touchToDraw: boolean
  wheelZoom: boolean
}

export const useGlobalSettings = create<GlobalSettings>()(
  persist((_set) => ({
    touchToDraw: false,
    wheelZoom: false,
  }), {
    name: 'cpaint',
  }));
