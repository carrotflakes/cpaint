import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_PRESSURE_CURVE, PressureCurve } from '../libs/pressureCurve';


export type GlobalSettings = {
  touchToDraw: boolean
  wheelZoom: boolean
  pressureCurve: PressureCurve
  angleSnapDivisor: number
  showOpHistory: boolean
}

export const useGlobalSettings = create<GlobalSettings>()(
  persist((_set) => ({
    touchToDraw: false,
    wheelZoom: false,
    pressureCurve: DEFAULT_PRESSURE_CURVE,
    angleSnapDivisor: 4,
    showOpHistory: false,
  }), {
    name: 'cpaint',
  }));
