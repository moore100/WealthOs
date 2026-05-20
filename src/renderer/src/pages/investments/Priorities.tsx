import { useState, useEffect, useCallback } from 'react'
import { Telescope, Plus, Target } from 'lucide-react'
import { Button } from '@/components/ui/button'
import WatchlistCard, { type WatchlistItem } from '@/components/priorities/WatchlistCard'
import AddAssetModal from '@/components/priorities/AddAssetModal'
import ErrorBoundary from '@/components/ErrorBoundary'

const STORAGE_KEY = 'priorities_watchlist'

function loadWatchlist(): WatchlistItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return []
}

function saveWatchlist(list: WatchlistItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch { /* ignore */ }
}

export default function PrioritiesPage() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>(loadWatchlist)
  const [modalOpen, setModalOpen] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)

  useEffect(() => {
    saveWatchlist(watchlist)
  }, [watchlist])

  const handleAdd = useCallback((item: WatchlistItem) => {
    setWatchlist((prev) => [...prev, item])
    setModalOpen(false)
  }, [])

  const handleRemove = useCallback((id: string) => {
    setRemovingId(id)
    setTimeout(() => {
      setWatchlist((prev) => prev.filter((i) => i.id !== id))
      setRemovingId(null)
    }, 250)
  }, [])

  const handleUpdate = useCallback((id: string, updates: Partial<WatchlistItem>) => {
    setWatchlist((prev) =>
      prev.map((i) => (i.id === id ? { ...i, ...updates } : i))
    )
  }, [])

  const existingIds = watchlist.map((i) => i.id)

  return (
    <ErrorBoundary>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Priorities
            </h2>
            <p className="text-sm text-muted-foreground">
              Your personal watchlist for crypto and forex pairs
            </p>
          </div>
          {watchlist.length > 0 && (
            <Button size="sm" className="gap-1.5 h-8 text-xs" onClick={() => setModalOpen(true)}>
              <Plus className="h-3.5 w-3.5" />
              Add Asset
            </Button>
          )}
        </div>

        {/* Empty state */}
        {watchlist.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center">
              <Telescope className="h-8 w-8 text-muted-foreground/60" />
            </div>
            <div className="space-y-1">
              <p className="text-base font-medium">Nothing on your radar yet</p>
              <p className="text-sm text-muted-foreground max-w-xs">
                Search for a crypto pair or forex pair to start watching it.
              </p>
            </div>
            <Button size="sm" className="gap-1.5 h-9" onClick={() => setModalOpen(true)}>
              <Plus className="h-4 w-4" />
              Add Asset
            </Button>
          </div>
        )}

        {/* Watchlist grid */}
        {Array.isArray(watchlist) && watchlist.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {watchlist.filter(Boolean).map((item) => (
              <ErrorBoundary key={item?.id || Math.random()}>
                <div
                  className={removingId === item?.id ? 'opacity-0 scale-95 transition-all duration-250' : 'transition-all duration-300'}
                >
                  <WatchlistCard
                    item={item}
                    onRemove={handleRemove}
                    onUpdate={handleUpdate}
                  />
                </div>
              </ErrorBoundary>
            ))}
          </div>
        )}

        <AddAssetModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onAdd={handleAdd}
          existingIds={existingIds}
        />
      </div>
    </ErrorBoundary>
  )
}
