import { create } from 'zustand'
import type { AppSettings } from '../types'
import { getDefaultHiddenItems } from '../components/layout/sidebarNav'
import { CURRENCIES } from '../utils/formatCurrency'

export interface AuthUser {
  id: number
  username: string
  displayName: string
}

interface AppStore {
  settings: AppSettings
  isOnboarded: boolean
  commandPaletteOpen: boolean
  currentPage: string
  sidebarCollapsed: boolean
  currentUser: AuthUser | null
  hiddenSidebarItems: string[]
  sidebarSectionOrder: string[]
  tourCompleted: boolean
  tourActive: boolean

  setSettings: (settings: Partial<AppSettings>) => void
  updateSettings: (settings: Partial<AppSettings>) => Promise<void>
  setIsOnboarded: (v: boolean) => void
  setCommandPaletteOpen: (v: boolean) => void
  setCurrentPage: (page: string) => void
  setSidebarCollapsed: (v: boolean) => void
  setCurrentUser: (user: AuthUser | null) => void
  setHiddenSidebarItems: (items: string[]) => void
  setSidebarSectionOrder: (order: string[]) => void
  setTourActive: (v: boolean) => void
  completeTour: () => void
  loadSettings: () => Promise<void>
}

export const useAppStore = create<AppStore>((set, get) => ({
  settings: {
    country: 'US',
    currency: 'USD',
    currencySymbol: '$',
    locale: 'en-US',
    onboardingComplete: false,
  },
  isOnboarded: false,
  commandPaletteOpen: false,
  currentPage: '/dashboard',
  sidebarCollapsed: false,
  currentUser: null,
  hiddenSidebarItems: [],
  sidebarSectionOrder: [],
  tourCompleted: false,
  tourActive: false,

  setSettings: (partial) => {
    const newSettings = { ...get().settings, ...partial }
    set({ settings: newSettings })
    // Persist each key
    Object.entries(partial).forEach(([k, v]) => {
      window.api?.settings?.set(k, v).catch(() => {})
    })
  },

  updateSettings: async (partial: Partial<AppSettings>) => {
    // Auto-derive symbol + locale when currency changes
    let enriched = partial
    if (partial.currency) {
      const meta = CURRENCIES.find(c => c.code === partial.currency)
      enriched = {
        ...partial,
        currencySymbol: partial.currencySymbol ?? meta?.symbol ?? '$',
        locale: partial.locale ?? meta?.locale ?? 'en-US',
      }
    }
    const newSettings = { ...get().settings, ...enriched }
    set({ settings: newSettings })
    await window.api?.settings?.save(enriched)
  },

  setIsOnboarded: (v) => set({ isOnboarded: v }),
  setCommandPaletteOpen: (v) => set({ commandPaletteOpen: v }),
  setCurrentPage: (page) => set({ currentPage: page }),
  setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
  setCurrentUser: (user) => set({ currentUser: user }),
  setHiddenSidebarItems: (items) => {
    set({ hiddenSidebarItems: items })
    window.api?.settings?.set('hiddenSidebarItems', items).catch(() => {})
  },
  setSidebarSectionOrder: (order) => {
    set({ sidebarSectionOrder: order })
    window.api?.settings?.set('sidebarSectionOrder', order).catch(() => {})
  },
  setTourActive: (v) => set({ tourActive: v }),
  completeTour: () => {
    set({ tourCompleted: true, tourActive: false })
    window.api?.settings?.set('tourCompleted', true).catch(() => {})
  },

  loadSettings: async () => {
    try {
      const all = (await window.api?.settings?.getAll()) as any
      if (all) {
        const isFirstTime = !(all.sidebarInitialized === true)
        let hiddenItems: string[] = Array.isArray(all.hiddenSidebarItems) ? all.hiddenSidebarItems : []

        // First-time user: apply curated default visible pages.
        if (isFirstTime) {
          hiddenItems = getDefaultHiddenItems()
          window.api?.settings?.set('hiddenSidebarItems', hiddenItems).catch(() => {})
          window.api?.settings?.set('sidebarInitialized', true).catch(() => {})
        }

        // Derive missing symbol/locale from currency if needed
        let loadedSettings = { ...get().settings, ...all }
        if (loadedSettings.currency && (!loadedSettings.currencySymbol || !loadedSettings.locale)) {
          const meta = CURRENCIES.find(c => c.code === loadedSettings.currency)
          loadedSettings.currencySymbol = loadedSettings.currencySymbol ?? meta?.symbol ?? '$'
          loadedSettings.locale = loadedSettings.locale ?? meta?.locale ?? 'en-US'
        }
        set({
          settings: loadedSettings,
          isOnboarded: !!all.onboardingComplete,
          hiddenSidebarItems: hiddenItems,
          sidebarSectionOrder: Array.isArray(all.sidebarSectionOrder) ? all.sidebarSectionOrder : [],
          tourCompleted: !!all.tourCompleted,
          tourActive: isFirstTime && !all.tourCompleted,
        })
      }
    } catch (e) {
      console.warn('Failed to load settings', e)
    }
  },
}))
