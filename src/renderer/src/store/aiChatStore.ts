import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface ChatThread {
  id: string
  title: string
  messages: ChatMessage[]
  memory: string[]
  createdAt: string
  updatedAt: string
}

export interface ChatMessage {
  id?: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp?: string
  actions?: any[]
}

interface AIChatState {
  threads: ChatThread[]
  activeThreadId: string | null
  createThread: () => string
  closeThread: (id: string) => void
  setActiveThread: (id: string) => void
  addMessage: (threadId: string, message: ChatMessage) => void
  addMemory: (threadId: string, fact: string) => void
  getMemory: (threadId: string) => string[]
  updateThreadTitle: (threadId: string, title: string) => void
  renameThreadFromFirstMessage: (threadId: string, defaultTitle: string) => void
  getThread: (id: string) => ChatThread | undefined
  clearAllThreads: () => void
}

const generateId = () => Math.random().toString(36).slice(2, 9)

const now = () => new Date().toISOString()

export const useAIChatStore = create<AIChatState>()(
  persist(
    (set, get) => ({
      threads: [],
      activeThreadId: null,

      createThread: () => {
        const id = generateId()
        const thread: ChatThread = {
          id,
          title: 'New Chat',
          messages: [],
          memory: [],
          createdAt: now(),
          updatedAt: now(),
        }
        set(state => {
          // Remove empty threads that have no user messages (except active one)
          const cleaned = state.threads.filter(
            t => t.messages.some(m => m.role === 'user') || t.id === state.activeThreadId
          )
          return {
            threads: [...cleaned, thread],
            activeThreadId: id,
          }
        })
        return id
      },

      closeThread: (id: string) => {
        set(state => {
          const threads = state.threads.filter(t => t.id !== id)
          const activeThreadId =
            state.activeThreadId === id
              ? threads[threads.length - 1]?.id || null
              : state.activeThreadId
          return { threads, activeThreadId }
        })
      },

      setActiveThread: (id: string) => {
        set({ activeThreadId: id })
      },

      addMessage: (threadId: string, message: ChatMessage) => {
        set(state => ({
          threads: state.threads.map(t =>
            t.id === threadId
              ? {
                  ...t,
                  messages: [...t.messages, message],
                  updatedAt: now(),
                }
              : t
          ),
        }))
      },

      addMemory: (threadId: string, fact: string) => {
        set(state => ({
          threads: state.threads.map(t =>
            t.id === threadId
              ? { ...t, memory: [...t.memory, fact].slice(-20), updatedAt: now() }
              : t
          ),
        }))
      },

      getMemory: (threadId: string) => {
        return get().threads.find(t => t.id === threadId)?.memory || []
      },

      updateThreadTitle: (threadId: string, title: string) => {
        set(state => ({
          threads: state.threads.map(t =>
            t.id === threadId ? { ...t, title } : t
          ),
        }))
      },

      renameThreadFromFirstMessage: (threadId: string, defaultTitle: string) => {
        set(state => ({
          threads: state.threads.map(t => {
            if (t.id !== threadId || t.title !== 'New Chat') return t
            const firstUser = t.messages.find(m => m.role === 'user')
            const newTitle = firstUser
              ? firstUser.content.slice(0, 30) + (firstUser.content.length > 30 ? '...' : '')
              : defaultTitle
            return { ...t, title: newTitle }
          }),
        }))
      },

      getThread: (id: string) => {
        return get().threads.find(t => t.id === id)
      },

      clearAllThreads: () => {
        set({ threads: [], activeThreadId: null })
      },
    }),
    {
      name: 'wealthos-ai-chat',
      partialize: state => ({
        threads: state.threads,
        activeThreadId: state.activeThreadId,
      }),
    }
  )
)
