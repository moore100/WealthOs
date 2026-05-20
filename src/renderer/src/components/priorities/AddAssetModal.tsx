import { useState, useEffect, useMemo } from 'react'
import { Search, X, Check, TrendingUp, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'
import { fetchBinanceSymbols } from '@/services/binanceService'
import { COMMON_FOREX_PAIRS } from '@/services/frankfurterService'
import { cn } from '@/lib/utils'

export interface WatchlistItem {
  id: string
  type: 'crypto' | 'forex'
  symbol: string
  displayName: string
  chartType: 'candlestick' | 'line'
  interval: string
  addedAt: string
  lastAnalysis: null
}

interface AddAssetModalProps {
  open: boolean
  onClose: () => void
  onAdd: (item: WatchlistItem) => void
  existingIds: string[]
}

export default function AddAssetModal({ open, onClose, onAdd, existingIds }: AddAssetModalProps) {
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<'crypto' | 'forex'>('crypto')
  const [cryptoSymbols, setCryptoSymbols] = useState<{ symbol: string; baseAsset: string }[]>([])
  const [loadingCrypto, setLoadingCrypto] = useState(false)

  useEffect(() => {
    if (open && tab === 'crypto' && cryptoSymbols.length === 0) {
      setLoadingCrypto(true)
      fetchBinanceSymbols()
        .then((list) => setCryptoSymbols(list.map((s) => ({ symbol: s.symbol, baseAsset: s.baseAsset }))))
        .catch(() => {})
        .finally(() => setLoadingCrypto(false))
    }
  }, [open, tab, cryptoSymbols.length])

  const filteredCrypto = useMemo(() => {
    if (!search.trim()) return cryptoSymbols.slice(0, 50)
    const q = search.toUpperCase()
    return cryptoSymbols.filter(
      (s) => s.symbol.includes(q) || s.baseAsset.includes(q)
    )
  }, [cryptoSymbols, search])

  const filteredForex = useMemo(() => {
    if (!search.trim()) return COMMON_FOREX_PAIRS
    const q = search.toUpperCase()
    return COMMON_FOREX_PAIRS.filter(
      (p) => p.label.includes(q) || p.from.includes(q) || p.to.includes(q)
    )
  }, [search])

  const handleAddCrypto = (symbol: string, baseAsset: string) => {
    onAdd({
      id: symbol,
      type: 'crypto',
      symbol,
      displayName: `${baseAsset} / USDT`,
      chartType: 'candlestick',
      interval: '1h',
      addedAt: new Date().toISOString(),
      lastAnalysis: null,
    })
    setSearch('')
  }

  const handleAddForex = (from: string, to: string, label: string) => {
    const id = `${from}${to}`
    onAdd({
      id,
      type: 'forex',
      symbol: id,
      displayName: label,
      chartType: 'line',
      interval: '1d',
      addedAt: new Date().toISOString(),
      lastAnalysis: null,
    })
    setSearch('')
  }

  const isExisting = (id: string) => existingIds.includes(id)

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Add Asset to Watchlist
          </DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => { setTab(v as 'crypto' | 'forex'); setSearch('') }}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="crypto" className="text-xs">Crypto</TabsTrigger>
            <TabsTrigger value="forex" className="text-xs">Forex</TabsTrigger>
          </TabsList>

          <div className="mt-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder={tab === 'crypto' ? 'Search BTC, ETH, SOL...' : 'Search EUR, GBP, JPY...'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>
          </div>

          <TabsContent value="crypto" className="mt-2">
            {loadingCrypto ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-xs">Loading symbols...</span>
              </div>
            ) : (
              <div className="space-y-1 max-h-[300px] overflow-auto pr-1">
                {filteredCrypto.length === 0 ? (
                  <div className="text-center py-6 text-xs text-muted-foreground">No symbols found</div>
                ) : (
                  filteredCrypto.map((s) => {
                    const exists = isExisting(s.symbol)
                    return (
                      <button
                        key={s.symbol}
                        disabled={exists}
                        onClick={() => handleAddCrypto(s.symbol, s.baseAsset)}
                        className={cn(
                          'w-full flex items-center justify-between rounded-md px-3 py-2 text-xs transition-colors',
                          exists
                            ? 'opacity-50 cursor-not-allowed bg-muted'
                            : 'hover:bg-muted cursor-pointer'
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{s.baseAsset}</span>
                          <span className="text-muted-foreground">{s.symbol}</span>
                        </div>
                        {exists ? (
                          <Badge variant="secondary" className="text-[10px] h-5">Already watching</Badge>
                        ) : (
                          <Check className="h-3.5 w-3.5 text-primary opacity-0 group-hover:opacity-100" />
                        )}
                      </button>
                    )
                  })
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="forex" className="mt-2">
            <div className="space-y-1 max-h-[300px] overflow-auto pr-1">
              {filteredForex.length === 0 ? (
                <div className="text-center py-6 text-xs text-muted-foreground">No pairs found</div>
              ) : (
                filteredForex.map((p) => {
                  const id = `${p.from}${p.to}`
                  const exists = isExisting(id)
                  return (
                    <button
                      key={id}
                      disabled={exists}
                      onClick={() => handleAddForex(p.from, p.to, p.label)}
                      className={cn(
                        'w-full flex items-center justify-between rounded-md px-3 py-2 text-xs transition-colors',
                        exists
                          ? 'opacity-50 cursor-not-allowed bg-muted'
                          : 'hover:bg-muted cursor-pointer'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-medium">{p.label}</span>
                      </div>
                      {exists ? (
                        <Badge variant="secondary" className="text-[10px] h-5">Already watching</Badge>
                      ) : (
                        <Check className="h-3.5 w-3.5 text-primary opacity-0 group-hover:opacity-100" />
                      )}
                    </button>
                  )
                })
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
