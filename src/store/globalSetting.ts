import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { OptimizedEffectOptions } from '../features/effects/optimized';
import { DEFAULT_PRESSURE_CURVE, PressureCurve } from '../libs/pressureCurve';

export type GlobalSettings = {
  touchToDraw: boolean
  wheelZoom: boolean
  pressureCurve: PressureCurve
  angleSnapDivisor: number
  showOpHistory: boolean
  effectPerformance: OptimizedEffectOptions
}

export const useGlobalSettings = create<GlobalSettings>()(
  persist((_set) => ({
    touchToDraw: false,
    wheelZoom: false,
    pressureCurve: DEFAULT_PRESSURE_CURVE,
    angleSnapDivisor: 4,
    showOpHistory: false,
    effectPerformance: {
      preferWebGL: true,
      useWorker: true,
      chunkSize: 65536,
      enableSIMD: true
    }
  }), {
    name: 'cpaint',
  }));
