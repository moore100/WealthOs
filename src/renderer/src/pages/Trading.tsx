import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Switch } from '../components/ui/switch'
import { ScrollArea } from '../components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select'
import { useTradingStore } from '../store/tradingStore'
import { ArrowLeftRight, Check, X, Loader2, Shield, Link2, BookOpen, Lock, AlertTriangle } from 'lucide-react'

interface SetupStep {
  title: string
  description: string
  icon: React.ReactNode
}

const BINANCE_STEPS: SetupStep[] = [
  {
    title: 'Create a Binance Account',
    description: 'If you don\'t have one, sign up at binance.com and complete identity verification (KYC).',
    icon: <BookOpen className="w-5 h-5" />,
  },
  {
    title: 'Generate API Keys',
    description: 'Go to Account → API Management → Create API Key. Give it a name like "WealthOS Trading".',
    icon: <Lock className="w-5 h-5" />,
  },
  {
    title: 'Restrict Permissions',
    description: 'Enable ONLY "Spot Trading". Disable withdrawals. Whitelist your current IP address for extra security.',
    icon: <Shield className="w-5 h-5" />,
  },
  {
    title: 'Choose Practice Environment (Recommended)',
    description: 'Use Testnet (testnet.binance.vision) or Spot Demo (api-demo.binance.com) to practice risk-free before live trading.',
    icon: <AlertTriangle className="w-5 h-5" />,
  },
  {
    title: 'Connect WealthOS',
    description: 'Paste your API Key and Secret below. We encrypt them locally on your machine.',
    icon: <Link2 className="w-5 h-5" />,
  },
]

export default function TradingPage() {
  const store = useTradingStore()
  const [showSetup, setShowSetup] = useState(false)
  const [step, setStep] = useState(0)
  const [label, setLabel] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [apiSecret, setApiSecret] = useState('')
  const [mode, setMode] = useState<'live' | 'testnet' | 'demo'>('testnet')
  const [testing, setTesting] = useState(false)
  const [confirmAuto, setConfirmAuto] = useState(false)

  useEffect(() => {
    store.loadBrokers()
    store.loadTrades()
    store.loadEngineStatus()
  }, [])

  useEffect(() => {
    if (store.activeBroker) {
      store.loadAutoTradeSettings(store.activeBroker.id)
    }
  }, [store.activeBroker?.id])

  useEffect(() => {
    const id = setInterval(() => {
      store.loadPendingSignals()
      store.loadEngineStatus()
    }, 5000)
    return () => clearInterval(id)
  }, [])

  async function handleConnect() {
    if (!label.trim() || !apiKey.trim() || !apiSecret.trim()) {
      toast.error('Please fill in all fields')
      return
    }
    store.setLoading(true)
    try {
      const broker = await window.api.trading.addBroker({
        label: label.trim(),
        apiKey: apiKey.trim(),
        apiSecret: apiSecret.trim(),
        mode,
        isActive: true,
        config: {},
      })
      await window.api.trading.updateBroker(broker.id, { isActive: true })
      toast.success('Broker connected!')
      setShowSetup(false)
      setLabel('')
      setApiKey('')
      setApiSecret('')
      store.loadBrokers()
    } catch (e: any) {
      toast.error(e.message || 'Failed to connect')
    } finally {
      store.setLoading(false)
    }
  }

  async function handleTestConnection() {
    if (!store.activeBroker) return
    setTesting(true)
    try {
      const res = await window.api.trading.testConnection(store.activeBroker.id)
      if (res.ok) {
        toast.success('Connection successful!', { description: `Can trade: ${res.account.canTrade ? 'Yes' : 'No'}` })
      } else {
        toast.error(res.error || 'Connection failed')
      }
    } catch (e: any) {
      toast.error(e.message || 'Connection test failed')
    } finally {
      setTesting(false)
    }
  }

  async function handleDisconnect(id: number) {
    try {
      await window.api.trading.deleteBroker(id)
      toast.success('Broker disconnected')
      store.loadBrokers()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  async function handleCloseTrade(tradeId: number) {
    try {
      await window.api.trading.closeTrade(tradeId)
      toast.success('Trade marked as closed')
      store.loadTrades()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  async function handleCancelSignal(signalId: number) {
    try {
      await window.api.trading.cancelSignal(signalId)
      toast.success('Signal cancelled')
      store.loadPendingSignals()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const openTrades = store.trades.filter((t) => t.status === 'open')
  const closedTrades = store.trades.filter((t) => t.status === 'closed')

  return (
    <div className="h-full flex flex-col">
      <div className="p-6 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ArrowLeftRight className="w-6 h-6 text-primary" />
              AI Trading
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Connect your exchange and let the AI execute trades based on signals
            </p>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* ── Broker Selector ── */}
          <section>
            <h2 className="text-lg font-semibold mb-3">Select Trading Platform</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Binance Card */}
              <Card
                className={`cursor-pointer transition-all hover:shadow-md ${
                  store.activeBroker?.platform === 'binance'
                    ? 'ring-2 ring-primary border-primary'
                    : 'border-border/60 opacity-90 hover:opacity-100'
                }`}
                onClick={() => {
                  if (!store.activeBroker) setShowSetup(true)
                }}
              >
                <CardContent className="p-5 flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-xl font-bold text-black shrink-0"
                    style={{ backgroundColor: '#F0B90B' }}
                  >
                    B
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold">Binance</h3>
                    <p className="text-xs text-muted-foreground truncate">
                      {store.activeBroker?.platform === 'binance'
                        ? store.activeBroker.label
                        : 'Spot trading with your own API keys'}
                    </p>
                  </div>
                  {store.activeBroker?.platform === 'binance' && (
                    <Check className="w-5 h-5 text-green-500 shrink-0" />
                  )}
                </CardContent>
              </Card>

              {/* Coming soon cards */}
              {['Bybit', 'Coinbase', 'Kraken'].map((name) => (
                <Card
                  key={name}
                  className="border-border/40 opacity-50 cursor-not-allowed"
                >
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center text-sm font-bold shrink-0">
                      {name[0]}
                    </div>
                    <div>
                      <h3 className="font-semibold">{name}</h3>
                      <p className="text-xs text-muted-foreground">Coming soon</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* ── Setup Guide / Active Broker ── */}
          {showSetup && !store.activeBroker && (
            <Card className="border-primary/30">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  Binance Setup Guide
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Steps */}
                <div className="space-y-3">
                  {BINANCE_STEPS.map((s, i) => (
                    <div
                      key={i}
                      className={`flex gap-3 p-3 rounded-lg transition-colors ${
                        step === i ? 'bg-primary/5 border border-primary/20' : 'bg-muted/30'
                      }`}
                      onClick={() => setStep(i)}
                    >
                      <div className="mt-0.5 text-muted-foreground">{s.icon}</div>
                      <div>
                        <p className="text-sm font-medium">{s.title}</p>
                        {step === i && (
                          <p className="text-xs text-muted-foreground mt-1">{s.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Connection form */}
                <div className="space-y-3 border-t border-border/50 pt-4">
                  <h3 className="text-sm font-semibold">Connect Account</h3>
                  <Input
                    placeholder="Account label (e.g. My Binance)"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                  />
                  <Input
                    placeholder="API Key"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                  <Input
                    placeholder="API Secret"
                    type="password"
                    value={apiSecret}
                    onChange={(e) => setApiSecret(e.target.value)}
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Select value={mode} onValueChange={(v: any) => setMode(v)}>
                        <SelectTrigger className="h-8 text-xs w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="testnet">Testnet</SelectItem>
                          <SelectItem value="demo">Spot Demo</SelectItem>
                          <SelectItem value="live">Live</SelectItem>
                        </SelectContent>
                      </Select>
                      <span className="text-sm text-muted-foreground">Environment</span>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setShowSetup(false)}>
                        Cancel
                      </Button>
                      <Button size="sm" onClick={handleConnect} disabled={store.loading}>
                        {store.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Connect'}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Active broker info */}
          {store.activeBroker && (
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold text-black shrink-0"
                      style={{ backgroundColor: '#F0B90B' }}
                    >
                      B
                    </div>
                    <div>
                      <p className="font-semibold">{store.activeBroker.label}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-green-500" />
                          Connected
                        </span>
                        <span className="capitalize">{store.activeBroker.mode || 'testnet'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleTestConnection} disabled={testing}>
                      {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Test Connection'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-600"
                      onClick={() => handleDisconnect(store.activeBroker!.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Auto Trade Settings ── */}
          {store.activeBroker && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Auto-Trade Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Enable Autonomous Trading</p>
                    <p className="text-xs text-muted-foreground">
                      The AI will automatically open trades when signals are generated
                    </p>
                    {store.engineRunning && (
                      <span className="text-[10px] flex items-center gap-1 text-green-500 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        Engine running — monitoring prices
                      </span>
                    )}
                  </div>
                  <Switch
                    checked={store.autoTradeEnabled}
                    onCheckedChange={(v) => {
                      if (v) setConfirmAuto(true)
                      else {
                        store.setAutoTradeEnabled(false)
                        if (store.activeBroker) {
                          store.syncAutoTrade(store.activeBroker.id, false)
                        }
                      }
                    }}
                  />
                </div>

                {confirmAuto && (
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 space-y-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                          Risk Warning
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Autonomous trading will use real funds on your exchange account. Set strict limits below.
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs font-medium">Max Position %</label>
                        <Input
                          type="number"
                          value={store.maxPositionPct}
                          onChange={(e) => store.setMaxPositionPct(Number(e.target.value))}
                          min={1}
                          max={100}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium">Daily Loss Limit ($)</label>
                        <Input
                          type="number"
                          value={store.dailyLossLimit}
                          onChange={(e) => store.setDailyLossLimit(Number(e.target.value))}
                          min={1}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium">Min Confidence %</label>
                        <Input
                          type="number"
                          value={store.minConfidence}
                          onChange={(e) => store.setMinConfidence(Number(e.target.value))}
                          min={1}
                          max={100}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setConfirmAuto(false)}>
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={async () => {
                          store.setAutoTradeEnabled(true)
                          setConfirmAuto(false)
                          if (store.activeBroker) {
                            await store.syncAutoTrade(store.activeBroker.id, true)
                          }
                          toast.success('Auto-trade enabled with guardrails')
                        }}
                      >
                        I Understand, Enable
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ── Pending Signals ── */}
          {store.activeBroker && store.pendingSignals.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-3">Pending Signals</h2>
              <div className="space-y-2">
                {store.pendingSignals.map((sig) => (
                  <Card key={sig.id} className="overflow-hidden border-dashed border-border/60">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="text-sm font-mono font-bold">{sig.symbol}</div>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              sig.direction === 'long'
                                ? 'bg-green-500/10 text-green-600'
                                : 'bg-red-500/10 text-red-600'
                            }`}
                          >
                            {sig.direction.toUpperCase()}
                          </span>
                          <div className="text-xs text-muted-foreground">
                            Entry {sig.entry_price.toFixed(2)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {sig.confidence}% confidence
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-red-500"
                          onClick={() => handleCancelSignal(sig.id)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* ── Active Trades ── */}
          <section>
            <h2 className="text-lg font-semibold mb-3">Active Trades</h2>
            {openTrades.length === 0 ? (
              <Card className="border-dashed border-border/60">
                <CardContent className="p-8 text-center text-muted-foreground text-sm">
                  No active trades. Execute a trade from an AI signal to get started.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {openTrades.map((t) => (
                  <Card key={t.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="text-sm font-mono font-bold">{t.symbol}</div>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              t.side === 'long'
                                ? 'bg-green-500/10 text-green-600'
                                : 'bg-red-500/10 text-red-600'
                            }`}
                          >
                            {t.side.toUpperCase()}
                          </span>
                          <div className="text-xs text-muted-foreground">
                            Qty: {t.quantity} @ {t.entry_price.toFixed(2)}
                          </div>
                          {t.stop_loss && (
                            <div className="text-xs text-red-500">SL: {t.stop_loss.toFixed(2)}</div>
                          )}
                          {t.take_profit && (
                            <div className="text-xs text-green-500">TP: {t.take_profit.toFixed(2)}</div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500"
                          onClick={() => handleCloseTrade(t.id)}
                        >
                          Close
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>

          {/* ── Trade History ── */}
          {closedTrades.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-3">Trade History</h2>
              <div className="space-y-2">
                {closedTrades.map((t) => (
                  <Card key={t.id} className="overflow-hidden opacity-70">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="text-sm font-mono font-bold">{t.symbol}</div>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              t.side === 'long'
                                ? 'bg-green-500/10 text-green-600'
                                : 'bg-red-500/10 text-red-600'
                            }`}
                          >
                            {t.side.toUpperCase()}
                          </span>
                          <div className="text-xs text-muted-foreground">
                            Qty: {t.quantity} @ {t.entry_price.toFixed(2)}
                          </div>
                        </div>
                        <div className={`text-sm font-mono font-medium ${(t.pnl || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {t.pnl !== undefined && t.pnl !== null ? `${t.pnl >= 0 ? '+' : ''}${t.pnl.toFixed(2)}` : '—'}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
