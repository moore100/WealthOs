import { create } from 'zustand'

export interface PluginMeta {
  id: number
  name: string
  description: string
  version: string
  author: string
  file_name: string
  enabled: number
  created_at: string
}

interface PluginStore {
  plugins: PluginMeta[]
  loadPlugins: () => Promise<void>
  togglePlugin: (id: number, enabled: boolean) => Promise<void>
}

export const usePluginStore = create<PluginStore>((set, get) => ({
  plugins: [],

  loadPlugins: async () => {
    try {
      const res = await window.api?.plugin?.discover()
      if (res?.ok) {
        set({ plugins: (res.plugins || []) as PluginMeta[] })
      }
    } catch (e) {
      console.error('[pluginStore] load failed:', e)
    }
  },

  togglePlugin: async (id, enabled) => {
    try {
      const res = await window.api?.plugin?.toggle(id, enabled)
      if (res?.ok) {
        set({
          plugins: get().plugins.map(p =>
            p.id === id ? { ...p, enabled: enabled ? 1 : 0 } : p
          )
        })
      }
    } catch (e) {
      console.error('[pluginStore] toggle failed:', e)
    }
  },
}))
