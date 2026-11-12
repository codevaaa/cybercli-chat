import type { CodicBridge } from '../shared/contracts'

declare global {
  interface Window {
    codic: CodicBridge
  }
}

export {}
