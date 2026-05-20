import { create } from 'zustand'

export interface Business {
  id: number
  name: string
  slug: string
  logo_path: string | null
  description: string | null
  industry: string | null
  website: string | null
  founded_date: string | null
  currency: string
  brand_color: string
  mission: string | null
  target_audience: string | null
  is_active: number
  created_at: string
  updated_at: string
  agent_count?: number
  asset_count?: number
  social_account_count?: number
}

interface BusinessState {
  businesses: Business[]
  activeBusinessId: number | null
  loading: boolean
  loadAll: () => Promise<void>
  setActive: (id: number | null) => void
  refresh: () => Promise<void>
}

export const useBusinessStore = create<BusinessState>((set, get) => ({
  businesses: [],
  activeBusinessId: null,
  loading: false,

  loadAll: async () => {
    set({ loading: true })
    try {
      const data = await (window as any).api?.businesses?.list()
      set({ businesses: data || [], loading: false })
      // Auto-select first business if none selected
      if (!get().activeBusinessId && data?.length) {
        set({ activeBusinessId: data[0].id })
      }
    } catch (e) {
      console.error('[businessStore] loadAll failed', e)
      set({ loading: false })
    }
  },

  setActive: (id) => set({ activeBusinessId: id }),

  refresh: async () => {
    await get().loadAll()
  },
}))
