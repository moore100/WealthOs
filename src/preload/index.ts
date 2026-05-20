import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Expose theme immediately for FOUC prevention
const themeData = null // sync call placeholder

const api = {
  // Window controls
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close'),
    open: () => ipcRenderer.send('window:open'),
    navigate: (path: string) => ipcRenderer.send('window:navigate', path),
  },

  // Floating Widget
  widget: {
    toggle: () => ipcRenderer.invoke('widget:toggle'),
    summary: () => ipcRenderer.invoke('widget:summary'),
    close: () => ipcRenderer.invoke('widget:close'),
  },

  // Store
  store: {
    get: (key: string) => ipcRenderer.invoke('store:get', key),
    set: (key: string, value: unknown) => ipcRenderer.invoke('store:set', key, value),
    delete: (key: string) => ipcRenderer.invoke('store:delete', key),
  },

  // Data Management
  data: {
    export: () => ipcRenderer.invoke('data:export'),
    import: () => ipcRenderer.invoke('data:import'),
    clearAll: () => ipcRenderer.invoke('data:clearAll'),
    clearCategory: (category: string) => ipcRenderer.invoke('data:clearCategory', category),
  },

  // Theme
  theme: {
    get: () => ipcRenderer.invoke('theme:get'),
    set: (theme: Record<string, unknown>) => ipcRenderer.invoke('theme:set', theme),
    update: (key: string, value: unknown) => ipcRenderer.invoke('theme:update', key, value),
  },

  // Settings
  settings: {
    get: (key?: string) => key ? ipcRenderer.invoke('settings:get', key) : ipcRenderer.invoke('settings:getAll'),
    set: (key: string, value: unknown) => ipcRenderer.invoke('settings:set', key, value),
    save: (obj: Record<string, unknown>) => ipcRenderer.invoke('settings:save', obj),
    getAll: () => ipcRenderer.invoke('settings:getAll'),
  },

  // Income
  income: {
    getAll: () => ipcRenderer.invoke('income:getAll'),
    add: (data: unknown) => ipcRenderer.invoke('income:add', data),
    update: (id: number, data: unknown) => ipcRenderer.invoke('income:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('income:delete', id),
  },

  // Categories
  categories: {
    getAll: () => ipcRenderer.invoke('categories:getAll'),
    add: (data: unknown) => ipcRenderer.invoke('categories:add', data),
    update: (id: number, data: unknown) => ipcRenderer.invoke('categories:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('categories:delete', id),
  },

  // Expenses
  expenses: {
    getAll: (filters?: unknown) => ipcRenderer.invoke('expenses:getAll', filters),
    add: (data: unknown) => ipcRenderer.invoke('expenses:add', data),
    update: (id: number, data: unknown) => ipcRenderer.invoke('expenses:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('expenses:delete', id),
    getByCategory: (month: string) => ipcRenderer.invoke('expenses:getByCategory', month),
  },

  // Regret Tracker
  regret: {
    toggle: (id: number, regret: 0 | 1, note?: string) => ipcRenderer.invoke('regret:toggle', id, regret, note),
    list: () => ipcRenderer.invoke('regret:list'),
    stats: () => ipcRenderer.invoke('regret:stats'),
  },

  // Time Machine
  timeMachine: {
    snapshot: (date: string) => ipcRenderer.invoke('timeMachine:snapshot', date),
  },

  // Couple Sync
  couple: {
    getPartner: () => ipcRenderer.invoke('couple:getPartner'),
    setPartner: (data: unknown) => ipcRenderer.invoke('couple:setPartner', data),
    removePartner: () => ipcRenderer.invoke('couple:removePartner'),
    listShared: () => ipcRenderer.invoke('couple:listShared'),
    addShared: (data: unknown) => ipcRenderer.invoke('couple:addShared', data),
    settleShared: (id: number) => ipcRenderer.invoke('couple:settleShared', id),
    deleteShared: (id: number) => ipcRenderer.invoke('couple:deleteShared', id),
    summary: () => ipcRenderer.invoke('couple:summary'),
  },

  // Loans
  loans: {
    getAll: () => ipcRenderer.invoke('loans:getAll'),
    add: (data: unknown) => ipcRenderer.invoke('loans:add', data),
    update: (id: number, data: unknown) => ipcRenderer.invoke('loans:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('loans:delete', id),
    logPayment: (data: unknown) => ipcRenderer.invoke('loans:logPayment', data),
    getPayments: (loanId: number) => ipcRenderer.invoke('loans:getPayments', loanId),
  },

  // Goals
  goals: {
    getAll: () => ipcRenderer.invoke('goals:getAll'),
    getById: (id: number) => ipcRenderer.invoke('goals:getById', id),
    add: (data: unknown) => ipcRenderer.invoke('goals:add', data),
    update: (id: number, data: unknown) => ipcRenderer.invoke('goals:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('goals:delete', id),
    logContribution: (id: number, amount: number) => ipcRenderer.invoke('goals:logContribution', id, amount),
  },

  // Investments
  investments: {
    getAll: () => ipcRenderer.invoke('investments:getAll'),
    add: (data: unknown) => ipcRenderer.invoke('investments:add', data),
    update: (id: number, data: unknown) => ipcRenderer.invoke('investments:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('investments:delete', id),
  },

  // People
  people: {
    getAll: () => ipcRenderer.invoke('people:getAll'),
    add: (data: unknown) => ipcRenderer.invoke('people:add', data),
    update: (id: number, data: unknown) => ipcRenderer.invoke('people:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('people:delete', id),
    markPaid: (id: number) => ipcRenderer.invoke('people:markPaid', id),
  },

  // Subscriptions
  subscriptions: {
    getAll: () => ipcRenderer.invoke('subscriptions:getAll'),
    add: (data: unknown) => ipcRenderer.invoke('subscriptions:add', data),
    update: (id: number, data: unknown) => ipcRenderer.invoke('subscriptions:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('subscriptions:delete', id),
  },

  // Habits
  habits: {
    getAll: () => ipcRenderer.invoke('habits:getAll'),
    add: (data: unknown) => ipcRenderer.invoke('habits:add', data),
    update: (id: number, data: unknown) => ipcRenderer.invoke('habits:update', id, data),
    logEntry: (data: unknown) => ipcRenderer.invoke('habits:logEntry', data),
    getLogs: (habitId: number) => ipcRenderer.invoke('habits:getLogs', habitId),
    delete: (id: number) => ipcRenderer.invoke('habits:delete', id),
  },

  // Budget
  budget: {
    getForMonth: (month: string) => ipcRenderer.invoke('budget:getForMonth', month),
    getByMonth: (month: string) => ipcRenderer.invoke('budget:getByMonth', month),
    add: (data: unknown) => ipcRenderer.invoke('budget:add', data),
    update: (id: number, data: unknown) => ipcRenderer.invoke('budget:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('budget:delete', id),
    updateCategoryBudget: (categoryId: number, budget: number) => ipcRenderer.invoke('budget:updateCategoryBudget', categoryId, budget),
  },

  // Net Worth
  netWorth: {
    getHistory: () => ipcRenderer.invoke('networth:getHistory'),
    saveSnapshot: (data: unknown) => ipcRenderer.invoke('networth:saveSnapshot', data),
    delete: (id: number) => ipcRenderer.invoke('networth:delete', id),
  },

  // Date Budgets
  dateBudgets: {
    getAll: () => ipcRenderer.invoke('dateBudgets:getAll'),
    add: (data: unknown) => ipcRenderer.invoke('dateBudgets:add', data),
    update: (id: number, data: unknown) => ipcRenderer.invoke('dateBudgets:update', id, data),
    getItems: (budgetId: number) => ipcRenderer.invoke('dateBudgets:getItems', budgetId),
    addItem: (data: unknown) => ipcRenderer.invoke('dateBudgets:addItem', data),
    delete: (id: number) => ipcRenderer.invoke('dateBudgets:delete', id),
  },

  // Mood
  mood: {
    getAll: (limit?: number) => ipcRenderer.invoke('mood:getAll', limit),
    log: (data: unknown) => ipcRenderer.invoke('mood:log', data),
    delete: (id: number) => ipcRenderer.invoke('mood:delete', id),
  },

  // Insights
  insights: {
    getAll: () => ipcRenderer.invoke('insights:getAll'),
    add: (data: unknown) => ipcRenderer.invoke('insights:add', data),
    dismiss: (id: number) => ipcRenderer.invoke('insights:dismiss', id),
    markActioned: (id: number) => ipcRenderer.invoke('insights:markActioned', id),
  },

  // Paying People
  payingPeople: {
    getAll: () => ipcRenderer.invoke('payingPeople:getAll'),
    add: (data: unknown) => ipcRenderer.invoke('payingPeople:add', data),
    update: (id: number, data: unknown) => ipcRenderer.invoke('payingPeople:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('payingPeople:delete', id),
  },

  // Dashboard
  dashboard: {
    getSummary: (month: string) => ipcRenderer.invoke('dashboard:getSummary', month),
    getTrends: (range: string) => ipcRenderer.invoke('dashboard:getTrends', range),
  },

  // Export
  export: {
    toJson: () => ipcRenderer.invoke('export:json'),
  },

  // Reminders
  reminders: {
    getAll: () => ipcRenderer.invoke('reminders:getAll'),
    add: (data: { title: string; body?: string; scheduledAt: string; repeat?: string; category?: string }) => ipcRenderer.invoke('reminders:add', data),
    update: (id: number, data: Record<string, unknown>) => ipcRenderer.invoke('reminders:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('reminders:delete', id),
    fireNow: (id: number) => ipcRenderer.invoke('reminders:fireNow', id),
  },

  notifications: {
    send: (title: string, body: string) => ipcRenderer.invoke('notifications:send', title, body),
  },

  // Auth
  auth: {
    register: (data: { username: string; displayName: string; password: string }) => ipcRenderer.invoke('auth:register', data),
    login: (data: { username: string; password: string }) => ipcRenderer.invoke('auth:login', data),
    logout: () => ipcRenderer.invoke('auth:logout'),
    getSession: () => ipcRenderer.invoke('auth:getSession'),
    listUsers: () => ipcRenderer.invoke('auth:listUsers'),
  },

  // AI
  ai: {
    testKey: (apiKey: string) => ipcRenderer.invoke('ai:testKey', apiKey),
    chat: (message: string, memory?: string[]) => ipcRenderer.invoke('ai:chat', message, memory || []),
    createGoal: (data: unknown) => ipcRenderer.invoke('ai:createGoal', data),
    createReminder: (data: unknown) => ipcRenderer.invoke('ai:createReminder', data),
    getVoices: (apiKey?: string) => ipcRenderer.invoke('ai:getVoices', apiKey),
    speak: (text: string, voiceId?: string, apiKey?: string) => ipcRenderer.invoke('ai:speak', text, voiceId, apiKey),
    transcribe: (audioBase64: string) => ipcRenderer.invoke('ai:transcribe', audioBase64),
    generateTheme: (description: string) => ipcRenderer.invoke('ai:generateTheme', description),
    generateInsights: () => ipcRenderer.invoke('ai:generateInsights'),
  },

  // Knowledge Base
  kb: {
    get: () => ipcRenderer.invoke('kb:get'),
    save: (content: string) => ipcRenderer.invoke('kb:save', content),
  },

  // AI Agent
  agent: {
    execute: (action: any) => ipcRenderer.invoke('agent:execute', action),
  },

  // Bank Statement Importer
  importer: {
    pickFile: () => ipcRenderer.invoke('import:pickFile'),
    parseStatement: (path: string) => ipcRenderer.invoke('import:parseStatement', path),
    parseReceipt: (ocrText: string) => ipcRenderer.invoke('import:parseReceipt', ocrText),
    commit: (transactions: any[]) => ipcRenderer.invoke('import:commit', transactions),
  },

  // LLM Provider
  llm: {
    getSettings: () => ipcRenderer.invoke('llm:getSettings'),
    listOllamaModels: (url: string) => ipcRenderer.invoke('llm:listOllamaModels', url),
    testOllama: (url: string, model: string) => ipcRenderer.invoke('llm:testOllama', url, model),
    complete: (opts: { messages: any[]; maxTokens?: number; jsonResponse?: boolean }) => ipcRenderer.invoke('ai:complete', opts),
  },

  // Daily Briefing
  briefing: {
    get: (force?: boolean) => ipcRenderer.invoke('briefing:get', force),
  },

  // Encrypted Vault Sync
  vault: {
    export: (password: string) => ipcRenderer.invoke('vault:export', password),
    import: (password: string) => ipcRenderer.invoke('vault:import', password),
    info: () => ipcRenderer.invoke('vault:info'),
  },

  // Plugin System
  plugin: {
    discover: () => ipcRenderer.invoke('plugin:discover'),
    install: (fileName: string, code: string) => ipcRenderer.invoke('plugin:install', fileName, code),
    uninstall: (fileName: string) => ipcRenderer.invoke('plugin:uninstall', fileName),
    toggle: (id: number, enabled: boolean) => ipcRenderer.invoke('plugin:toggle', id, enabled),
    getCode: (fileName: string) => ipcRenderer.invoke('plugin:getCode', fileName),
  },

  // Network / ISP
  network: {
    info: () => ipcRenderer.invoke('network:info'),
    devices: () => ipcRenderer.invoke('network:devices'),
    speedtest: () => ipcRenderer.invoke('network:speedtest'),
    routerFetch: (opts: { url: string; method?: string; headers?: Record<string, string>; body?: string }) =>
      ipcRenderer.invoke('network:routerFetch', opts),
    routerProbe: (gateway: string) => ipcRenderer.invoke('network:routerProbe', gateway),
    openRouter: (gateway: string) => ipcRenderer.invoke('network:openRouter', gateway),
  },

  // Subscription Killer
  subkiller: {
    scan: () => ipcRenderer.invoke('subkiller:scan'),
    draftCancelEmail: (sub: any) => ipcRenderer.invoke('subkiller:draftCancelEmail', sub),
  },

  // Tax Records
  tax: {
    getAll: () => ipcRenderer.invoke('tax:getAll'),
    add: (data: unknown) => ipcRenderer.invoke('tax:add', data),
    update: (id: number, data: unknown) => ipcRenderer.invoke('tax:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('tax:delete', id),
  },

  // Documents
  documents: {
    getAll: () => ipcRenderer.invoke('documents:getAll'),
    add: (data: unknown) => ipcRenderer.invoke('documents:add', data),
    update: (id: number, data: unknown) => ipcRenderer.invoke('documents:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('documents:delete', id),
  },

  // Wishlist
  wishlist: {
    getAll: () => ipcRenderer.invoke('wishlist:getAll'),
    getPurchased: () => ipcRenderer.invoke('wishlist:getPurchased'),
    add: (data: unknown) => ipcRenderer.invoke('wishlist:add', data),
    update: (id: number, data: unknown) => ipcRenderer.invoke('wishlist:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('wishlist:delete', id),
    markPurchased: (id: number) => ipcRenderer.invoke('wishlist:markPurchased', id),
  },

  // Cash Flow
  cashflow: {
    getAll: () => ipcRenderer.invoke('cashflow:getAll'),
    add: (data: unknown) => ipcRenderer.invoke('cashflow:add', data),
    update: (id: number, data: unknown) => ipcRenderer.invoke('cashflow:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('cashflow:delete', id),
  },

  // Sinking Funds
  sinkingFunds: {
    getAll: () => ipcRenderer.invoke('sinkingFunds:getAll'),
    add: (data: unknown) => ipcRenderer.invoke('sinkingFunds:add', data),
    update: (id: number, data: unknown) => ipcRenderer.invoke('sinkingFunds:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('sinkingFunds:delete', id),
    contribute: (id: number, amount: number) => ipcRenderer.invoke('sinkingFunds:contribute', id, amount),
  },

  // Health Score
  healthScore: {
    getHistory: () => ipcRenderer.invoke('healthScore:getHistory'),
    save: (data: unknown) => ipcRenderer.invoke('healthScore:save', data),
    delete: (id: number) => ipcRenderer.invoke('healthScore:delete', id),
  },

  // Payment Channels
  paymentChannels: {
    getAll: () => ipcRenderer.invoke('paymentChannels:getAll'),
    getById: (id: number) => ipcRenderer.invoke('paymentChannels:getById', id),
    add: (data: unknown) => ipcRenderer.invoke('paymentChannels:add', data),
    update: (id: number, data: unknown) => ipcRenderer.invoke('paymentChannels:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('paymentChannels:delete', id),
    toggle: (id: number) => ipcRenderer.invoke('paymentChannels:toggle', id),
    pay: (data: unknown) => ipcRenderer.invoke('paymentChannels:pay', data),
    withdraw: (data: unknown) => ipcRenderer.invoke('paymentChannels:withdraw', data),
    getTransactions: (channelId?: number) => ipcRenderer.invoke('paymentChannels:getTransactions', channelId),
    addToGoal: (goalId: number, amount: number) => ipcRenderer.invoke('paymentChannels:addToGoal', goalId, amount),
  },

  // Savings Intentions
  intentions: {
    getAll: () => ipcRenderer.invoke('intentions:getAll'),
    getById: (id: number) => ipcRenderer.invoke('intentions:getById', id),
    add: (data: unknown) => ipcRenderer.invoke('intentions:add', data),
    update: (id: number, data: unknown) => ipcRenderer.invoke('intentions:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('intentions:delete', id),
    toggleStatus: (id: number) => ipcRenderer.invoke('intentions:toggleStatus', id),
    generatePlan: (data: unknown) => ipcRenderer.invoke('intentions:generatePlan', data),
    completeCheckpoint: (checkpointId: number) => ipcRenderer.invoke('intentions:completeCheckpoint', checkpointId),
    getActiveCheckpoints: () => ipcRenderer.invoke('intentions:getActiveCheckpoints'),
  },

  // Trading
  trading: {
    getBrokers: () => ipcRenderer.invoke('trading:getBrokers'),
    addBroker: (data: unknown) => ipcRenderer.invoke('trading:addBroker', data),
    updateBroker: (id: number, data: unknown) => ipcRenderer.invoke('trading:updateBroker', id, data),
    deleteBroker: (id: number) => ipcRenderer.invoke('trading:deleteBroker', id),
    testConnection: (brokerId?: number) => ipcRenderer.invoke('trading:testConnection', brokerId),
    placeOrder: (order: unknown) => ipcRenderer.invoke('trading:placeOrder', order),
    getOpenOrders: (symbol?: string) => ipcRenderer.invoke('trading:getOpenOrders', symbol),
    cancelOrder: (symbol: string, orderId: string) => ipcRenderer.invoke('trading:cancelOrder', symbol, orderId),
    getTrades: () => ipcRenderer.invoke('trading:getTrades'),
    getTradesBySymbol: (symbol: string) => ipcRenderer.invoke('trading:getTradesBySymbol', symbol),
    closeTrade: (tradeId: number, pnl?: number) => ipcRenderer.invoke('trading:closeTrade', tradeId, pnl),
    submitSignals: (signals: any[]) => ipcRenderer.invoke('trading:submitSignals', signals),
    getPendingSignals: () => ipcRenderer.invoke('trading:getPendingSignals'),
    cancelSignal: (signalId: number) => ipcRenderer.invoke('trading:cancelSignal', signalId),
    setAutoTrade: (brokerId: number, enabled: boolean, settings?: any) => ipcRenderer.invoke('trading:setAutoTrade', brokerId, enabled, settings),
    getAutoTradeSettings: (brokerId?: number) => ipcRenderer.invoke('trading:getAutoTradeSettings', brokerId),
    getEngineStatus: () => ipcRenderer.invoke('trading:getEngineStatus'),
  },

  // Navigation events from main
  onNavigate: (callback: (path: string) => void) => {
    ipcRenderer.on('navigate', (_e, path) => callback(path))
    return () => ipcRenderer.removeAllListeners('navigate')
  },
  onOpenAddExpense: (callback: () => void) => {
    ipcRenderer.on('open-add-expense', () => callback())
    return () => ipcRenderer.removeAllListeners('open-add-expense')
  },
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
