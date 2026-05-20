interface Window {
  api: {
    window: {
      minimize: () => void
      maximize: () => void
      close: () => void
      open: () => void
      navigate: (path: string) => void
    }
    widget: {
      toggle: () => Promise<boolean>
      summary: () => Promise<{
        income: number
        expenses: number
        savings: number
        savingsRate: number
        upcoming: { name: string; amount: number; days: number }[]
        netWorth: number
      }>
      close: () => Promise<boolean>
    }
    store: {
      get: (key: string) => Promise<unknown>
      set: (key: string, value: unknown) => Promise<unknown>
      delete: (key: string) => Promise<void>
    }
    theme: {
      get: () => Promise<Record<string, unknown>>
      set: (theme: Record<string, unknown>) => Promise<boolean>
      update: (key: string, value: unknown) => Promise<boolean>
    }
    settings: {
      get: (key?: string) => Promise<any>
      set: (key: string, value: unknown) => Promise<boolean>
      save: (obj: Record<string, unknown>) => Promise<boolean>
      getAll: () => Promise<Record<string, unknown>>
    }
    data: {
      export: () => Promise<{ success: boolean; path?: string; cancelled?: boolean; error?: string }>
      import: () => Promise<{ success: boolean; cancelled?: boolean; error?: string }>
      clearAll: () => Promise<{ success: boolean }>
      clearCategory: (category: string) => Promise<{ success: boolean }>
    }
    income: {
      getAll: () => Promise<any[]>
      add: (data: unknown) => Promise<any>
      update: (id: number, data: unknown) => Promise<any>
      delete: (id: number) => Promise<any>
    }
    categories: {
      getAll: () => Promise<any[]>
      add: (data: unknown) => Promise<any>
      update: (id: number, data: unknown) => Promise<any>
      delete: (id: number) => Promise<any>
    }
    expenses: {
      getAll: (filters?: unknown) => Promise<any[]>
      add: (data: unknown) => Promise<any>
      update: (id: number, data: unknown) => Promise<any>
      delete: (id: number) => Promise<any>
      getByCategory: (month: string) => Promise<any[]>
    }
    regret: {
      toggle: (id: number, regret: 0 | 1, note?: string) => Promise<any>
      list: () => Promise<any[]>
      stats: () => Promise<any>
    }
    timeMachine: {
      snapshot: (date: string) => Promise<any>
    }
    couple: {
      getPartner: () => Promise<any>
      setPartner: (data: unknown) => Promise<any>
      removePartner: () => Promise<boolean>
      listShared: () => Promise<any[]>
      addShared: (data: unknown) => Promise<any>
      settleShared: (id: number) => Promise<boolean>
      deleteShared: (id: number) => Promise<boolean>
      summary: () => Promise<any>
    }
    loans: {
      getAll: () => Promise<any[]>
      add: (data: unknown) => Promise<any>
      update: (id: number, data: unknown) => Promise<any>
      delete: (id: number) => Promise<any>
      logPayment: (data: unknown) => Promise<any>
      getPayments: (loanId: number) => Promise<any[]>
    }
    goals: {
      getAll: () => Promise<any[]>
      getById: (id: number) => Promise<any>
      add: (data: unknown) => Promise<any>
      update: (id: number, data: unknown) => Promise<any>
      delete: (id: number) => Promise<any>
      logContribution: (id: number, amount: number) => Promise<any>
    }
    investments: {
      getAll: () => Promise<any[]>
      add: (data: unknown) => Promise<any>
      update: (id: number, data: unknown) => Promise<any>
      delete: (id: number) => Promise<any>
    }
    people: {
      getAll: () => Promise<any[]>
      add: (data: unknown) => Promise<any>
      update: (id: number, data: unknown) => Promise<any>
      delete: (id: number) => Promise<any>
      markPaid: (id: number) => Promise<boolean>
    }
    subscriptions: {
      getAll: () => Promise<any[]>
      add: (data: unknown) => Promise<any>
      update: (id: number, data: unknown) => Promise<any>
      delete: (id: number) => Promise<any>
    }
    habits: {
      getAll: () => Promise<any[]>
      add: (data: unknown) => Promise<any>
      update: (id: number, data: unknown) => Promise<any>
      logEntry: (data: unknown) => Promise<any>
      getLogs: (habitId: number) => Promise<any[]>
      delete: (id: number) => Promise<any>
    }
    budget: {
      getForMonth: (month: string) => Promise<any[]>
      updateCategoryBudget: (categoryId: number, budget: number) => Promise<boolean>
    }
    netWorth: {
      getHistory: () => Promise<any[]>
      saveSnapshot: (data: unknown) => Promise<any>
      delete: (id: number) => Promise<boolean>
    }
    dateBudgets: {
      getAll: () => Promise<any[]>
      add: (data: unknown) => Promise<any>
      update: (id: number, data: unknown) => Promise<any>
      getItems: (budgetId: number) => Promise<any[]>
      addItem: (data: unknown) => Promise<any>
      delete: (id: number) => Promise<any>
    }
    mood: {
      getAll: (limit?: number) => Promise<any[]>
      log: (data: unknown) => Promise<boolean>
    }
    insights: {
      getAll: () => Promise<any[]>
      add: (data: unknown) => Promise<any>
      dismiss: (id: number) => Promise<any>
      markActioned: (id: number) => Promise<boolean>
    }
    payingPeople: {
      getAll: () => Promise<any[]>
      add: (data: unknown) => Promise<any>
      update: (id: number, data: unknown) => Promise<any>
      delete: (id: number) => Promise<any>
    }
    dashboard: {
      getSummary: (month: string) => Promise<any>
      getTrends: (range: string) => Promise<any>
    }
    export: {
      toJson: () => Promise<any>
    }
    reminders: {
      getAll: () => Promise<any[]>
      add: (data: { title: string; body?: string; scheduledAt: string; repeat?: string; category?: string }) => Promise<any>
      update: (id: number, data: Record<string, unknown>) => Promise<any>
      delete: (id: number) => Promise<boolean>
      fireNow: (id: number) => Promise<boolean>
    }
    notifications: {
      send: (title: string, body: string) => Promise<boolean>
    }
    auth: {
      register: (data: { username: string; displayName: string; password: string }) => Promise<{ id: number; username: string; displayName: string }>
      login: (data: { username: string; password: string }) => Promise<{ id: number; username: string; displayName: string }>
      logout: () => Promise<boolean>
      getSession: () => Promise<{ id: number; username: string; displayName: string } | null>
      listUsers: () => Promise<{ id: number; username: string; displayName: string }[]>
    }
    ai: {
      testKey: (apiKey: string) => Promise<boolean>
      chat: (message: string, memory?: string[]) => Promise<string>
      createGoal: (data: unknown) => Promise<any>
      createReminder: (data: unknown) => Promise<any>
      getVoices: (apiKey?: string) => Promise<{ id: string; name: string; gender: string; preview?: string }[]>
      speak: (text: string, voiceId?: string, apiKey?: string) => Promise<{ audio: string }>
      transcribe: (audioBase64: string) => Promise<{ text: string }>
      generateTheme: (description: string) => Promise<Record<string, unknown>>
      generateInsights: () => Promise<any[]>
    }
    kb: {
      get: () => Promise<{ id: number | null; content: string; updated_at: string }>
      save: (content: string) => Promise<{ id: number; content: string; updated_at: string }>
    }
    agent: {
      execute: (action: any) => Promise<{ ok: boolean; summary: string; id?: number }>
    }
    importer: {
      pickFile: () => Promise<{ canceled: boolean; path?: string }>
      parseStatement: (path: string) => Promise<{ ok: boolean; error?: string; transactions?: any[]; truncated?: boolean; totalChars?: number }>
      parseReceipt: (ocrText: string) => Promise<{ ok: boolean; error?: string; receipt?: { name: string; amount: number; date: string; merchant: string | null; category: string; items: string[]; confidence: string } }>
      commit: (transactions: any[]) => Promise<{ ok: boolean; inserted: number }>
    }
    llm: {
      getSettings: () => Promise<{ provider: 'openai' | 'ollama'; openaiKey: string | null; openaiModel: string; ollamaUrl: string; ollamaModel: string }>
      listOllamaModels: (url: string) => Promise<{ ok: boolean; models?: string[]; error?: string }>
      testOllama: (url: string, model: string) => Promise<{ ok: boolean; error?: string; sample?: string }>
      complete: (opts: { messages: any[]; maxTokens?: number; jsonResponse?: boolean }) => Promise<{ ok: boolean; text?: string; error?: string }>
    }
    briefing: {
      get: (force?: boolean) => Promise<{ ok: boolean; content?: string; cached?: boolean; date?: string; error?: string }>
    }
    vault: {
      export: (password: string) => Promise<{ ok: boolean; path?: string; timestamp?: string; cancelled?: boolean; error?: string }>
      import: (password: string) => Promise<{ ok: boolean; path?: string; backupPath?: string; timestamp?: string; cancelled?: boolean; error?: string }>
      info: () => Promise<{ ok: boolean; lastBackup?: string | null; lastRestore?: string | null; error?: string }>
    }
    plugin: {
      discover: () => Promise<{ ok: boolean; plugins?: any[]; error?: string }>
      install: (fileName: string, code: string) => Promise<{ ok: boolean; fileName?: string; error?: string }>
      uninstall: (fileName: string) => Promise<{ ok: boolean; error?: string }>
      toggle: (id: number, enabled: boolean) => Promise<{ ok: boolean; error?: string }>
      getCode: (fileName: string) => Promise<{ ok: boolean; code?: string; error?: string }>
    }
    subkiller: {
      scan: () => Promise<{ ok: boolean; detected: any[]; tracked: any[]; totals: { monthlyTracked: number; monthlyDetected: number; yearlyTracked: number; yearlyDetected: number } }>
      draftCancelEmail: (sub: any) => Promise<{ ok: boolean; subject?: string; body?: string; error?: string }>
    }
    tax: {
      getAll: () => Promise<any[]>
      add: (data: unknown) => Promise<any>
      update: (id: number, data: unknown) => Promise<any>
      delete: (id: number) => Promise<any>
    }
    documents: {
      getAll: () => Promise<any[]>
      add: (data: unknown) => Promise<any>
      update: (id: number, data: unknown) => Promise<any>
      delete: (id: number) => Promise<any>
    }
    wishlist: {
      getAll: () => Promise<any[]>
      getPurchased: () => Promise<any[]>
      add: (data: unknown) => Promise<any>
      update: (id: number, data: unknown) => Promise<any>
      delete: (id: number) => Promise<any>
      markPurchased: (id: number) => Promise<any>
    }
    cashflow: {
      getAll: () => Promise<any[]>
      add: (data: unknown) => Promise<any>
      update: (id: number, data: unknown) => Promise<any>
      delete: (id: number) => Promise<any>
    }
    sinkingFunds: {
      getAll: () => Promise<any[]>
      add: (data: unknown) => Promise<any>
      update: (id: number, data: unknown) => Promise<any>
      delete: (id: number) => Promise<any>
      contribute: (id: number, amount: number) => Promise<any>
    }
    healthScore: {
      getHistory: () => Promise<any[]>
      save: (data: unknown) => Promise<any>
      delete: (id: number) => Promise<any>
    }
    network: {
      info: () => Promise<{
        ssid: string | null
        signal: number | null
        band: string | null
        bssid: string | null
        gateway: string | null
        localIp: string | null
        publicIp: string | null
        isp: string | null
        city: string | null
        country: string | null
        hostname: string
        platform: string
      }>
      devices: () => Promise<{ devices: Array<{ ip: string; mac: string; vendor: string | null }> }>
      speedtest: () => Promise<{ ok: boolean; result?: { downloadMbps: number; uploadMbps: number; pingMs: number; jitterMs: number; server: string }; error?: string }>
      routerFetch: (opts: { url: string; method?: string; headers?: Record<string, string>; body?: string }) => Promise<{ ok: boolean; status?: number; body?: string; headers?: Record<string, string>; error?: string }>
      routerProbe: (gateway: string) => Promise<{ brand: string | null; loginUrl: string; title: string | null; serverHeader: string | null }>
      openRouter: (gateway: string) => Promise<{ ok: boolean; error?: string }>
    }
    paymentChannels: {
      getAll: () => Promise<any[]>
      getById: (id: number) => Promise<any>
      add: (data: unknown) => Promise<any>
      update: (id: number, data: unknown) => Promise<any>
      delete: (id: number) => Promise<any>
      toggle: (id: number) => Promise<boolean>
      pay: (data: unknown) => Promise<any>
      withdraw: (data: unknown) => Promise<any>
      getTransactions: (channelId?: number) => Promise<any[]>
      addToGoal: (goalId: number, amount: number) => Promise<any>
    }
    intentions: {
      getAll: () => Promise<any[]>
      getById: (id: number) => Promise<any>
      add: (data: unknown) => Promise<any>
      update: (id: number, data: unknown) => Promise<any>
      delete: (id: number) => Promise<any>
      toggleStatus: (id: number) => Promise<string>
      generatePlan: (data: unknown) => Promise<any>
      completeCheckpoint: (checkpointId: number) => Promise<any>
      getActiveCheckpoints: () => Promise<any[]>
    }
    trading: {
      getBrokers: () => Promise<any[]>
      addBroker: (data: unknown) => Promise<any>
      updateBroker: (id: number, data: unknown) => Promise<any>
      deleteBroker: (id: number) => Promise<boolean>
      testConnection: (brokerId?: number) => Promise<{ ok: boolean; account?: any; error?: string }>
      placeOrder: (order: unknown) => Promise<{ ok: boolean; orderId?: number; status?: string }>
      getOpenOrders: (symbol?: string) => Promise<{ ok: boolean; orders?: any[]; error?: string }>
      cancelOrder: (symbol: string, orderId: string) => Promise<{ ok: boolean; result?: any }>
      getTrades: () => Promise<any[]>
      getTradesBySymbol: (symbol: string) => Promise<any[]>
      closeTrade: (tradeId: number, pnl?: number) => Promise<boolean>
      submitSignals: (signals: any[]) => Promise<{ ok: boolean; inserted: any[] }>
      getPendingSignals: () => Promise<any[]>
      cancelSignal: (signalId: number) => Promise<boolean>
      setAutoTrade: (brokerId: number, enabled: boolean, settings?: any) => Promise<{ ok: boolean; enabled: boolean; config: any }>
      getAutoTradeSettings: (brokerId?: number) => Promise<{ enabled: boolean; maxPositionPct: number; dailyLossLimit: number; minConfidence: number } | null>
      getEngineStatus: () => Promise<{ running: boolean }>
    }
    onNavigate: (callback: (path: string) => void) => () => void
    onOpenAddExpense: (callback: () => void) => () => void
  }
}
