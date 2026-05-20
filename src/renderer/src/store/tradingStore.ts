import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface TradingPreferences {
  portfolioBudget: number
  riskPercentPerTrade: number
  tradingMode: 'ai_suggest' | 'scalping' | 'day_trade' | 'swing' | 'position'
  maxHoldDuration: 'ai_suggest' | '1h' | '4h' | '1d' | '3d' | '1w' | '2w' | '1m'
  useTrailingStop: boolean
  autoExecute: boolean
}

export interface Broker {
  id: number
  platform: string
  label: string
  mode: string
  is_active: number
  created_at: string
}

export interface TradeRecord {
  id: number
  broker_id: number
  symbol: string
  side: string
  quantity: number
  entry_price: number
  stop_loss?: number
  take_profit?: number
  status: string
  external_order_id?: string
  pnl?: number
  closed_at?: string
  created_at: string
}

interface TradingStore {
  brokers: Broker[]
  activeBroker: Broker | null
  trades: TradeRecord[]
  autoTradeEnabled: boolean
  maxPositionPct: number
  dailyLossLimit: number
  minConfidence: number
  loading: boolean
  pendingSignals: any[]
  engineRunning: boolean
  tradingPreferences: TradingPreferences

  loadBrokers: () => Promise<void>
  loadTrades: () => Promise<void>
  loadPendingSignals: () => Promise<void>
  loadEngineStatus: () => Promise<void>
  loadAutoTradeSettings: (brokerId: number) => Promise<void>
  syncAutoTrade: (brokerId: number, enabled: boolean) => Promise<void>
  setActiveBroker: (broker: Broker | null) => void
  setAutoTradeEnabled: (v: boolean) => void
  setMaxPositionPct: (v: number) => void
  setDailyLossLimit: (v: number) => void
  setMinConfidence: (v: number) => void
  setLoading: (v: boolean) => void
  setPendingSignals: (v: any[]) => void
  setTradingPreferences: (prefs: Partial<TradingPreferences>) => void
}

export const useTradingStore = create<TradingStore>((set, get) => ({
  brokers: [],
  activeBroker: null,
  trades: [],
  autoTradeEnabled: false,
  maxPositionPct: 10,
  dailyLossLimit: 100,
  minConfidence: 60,
  loading: false,
  pendingSignals: [],
  engineRunning: false,
  tradingPreferences: {
    portfolioBudget: 1000,
    riskPercentPerTrade: 2,
    tradingMode: 'ai_suggest',
    maxHoldDuration: 'ai_suggest',
    useTrailingStop: false,
    autoExecute: false,
  },

  loadBrokers: async () => {
    const rows = await window.api.trading.getBrokers()
    const active = rows.find((b: Broker) => b.is_active === 1) || null
    set({ brokers: rows, activeBroker: active })
  },

  loadTrades: async () => {
    const rows = await window.api.trading.getTrades()
    set({ trades: rows })
  },

  loadPendingSignals: async () => {
    const rows = await window.api.trading.getPendingSignals()
    set({ pendingSignals: rows })
  },

  loadEngineStatus: async () => {
    const status = await window.api.trading.getEngineStatus()
    set({ engineRunning: status.running })
  },

  loadAutoTradeSettings: async (brokerId: number) => {
    const settings = await window.api.trading.getAutoTradeSettings(brokerId)
    if (settings) {
      set({
        autoTradeEnabled: settings.enabled,
        maxPositionPct: settings.maxPositionPct,
        dailyLossLimit: settings.dailyLossLimit,
        minConfidence: settings.minConfidence,
      })
    }
  },

  syncAutoTrade: async (brokerId: number, enabled: boolean) => {
    const { maxPositionPct, dailyLossLimit, minConfidence } = get()
    await window.api.trading.setAutoTrade(brokerId, enabled, {
      maxPositionPct,
      dailyLossLimit,
      minConfidence,
    })
  },

  setActiveBroker: (broker) => set({ activeBroker: broker }),
  setAutoTradeEnabled: (v) => set({ autoTradeEnabled: v }),
  setMaxPositionPct: (v) => set({ maxPositionPct: v }),
  setDailyLossLimit: (v) => set({ dailyLossLimit: v }),
  setMinConfidence: (v) => set({ minConfidence: v }),
  setLoading: (v) => set({ loading: v }),
  setPendingSignals: (v) => set({ pendingSignals: v }),
  setTradingPreferences: (prefs) => set(state => ({
    tradingPreferences: { ...state.tradingPreferences, ...prefs },
  })),
}))
