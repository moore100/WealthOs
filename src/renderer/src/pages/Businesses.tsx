import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Building2, Bot, Image, Share2, ArrowRight } from 'lucide-react'
import { useBusinessStore } from '@/store/businessStore'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function BusinessesPage() {
  const navigate = useNavigate()
  const { businesses, loading, loadAll } = useBusinessStore()
  const [logoCache, setLogoCache] = useState<Record<number, string>>({})

  useEffect(() => { loadAll() }, [])

  useEffect(() => {
    // Load logos for businesses that have one
    businesses.forEach(async (b) => {
      if (b.logo_path && !logoCache[b.id]) {
        const data = await (window as any).api?.businesses?.getLogo(b.id)
        if (data) setLogoCache(prev => ({ ...prev, [b.id]: data }))
      }
    })
  }, [businesses])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" /> My Businesses
          </h2>
          <p className="text-sm text-muted-foreground">Manage all your ventures from one place</p>
        </div>
        <Button onClick={() => navigate('/businesses/new')}>
          <Plus className="mr-2 h-4 w-4" /> New Business
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 w-full rounded-xl" />)}
        </div>
      ) : businesses.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <Building2 className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" />
            <p className="font-medium text-lg">No businesses yet</p>
            <p className="text-sm text-muted-foreground mb-4">Create your first business to start managing it with AI agents.</p>
            <Button onClick={() => navigate('/businesses/new')}>
              <Plus className="mr-2 h-4 w-4" /> Create Business
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {businesses.map(b => (
            <Card
              key={b.id}
              className="cursor-pointer transition hover:shadow-lg hover:border-primary/50"
              onClick={() => navigate(`/businesses/${b.id}`)}
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div
                    className="h-14 w-14 rounded-xl flex items-center justify-center text-white text-xl font-bold shrink-0 overflow-hidden"
                    style={{ background: b.brand_color || '#3b82f6' }}
                  >
                    {logoCache[b.id] ? (
                      <img src={logoCache[b.id]} alt={b.name} className="h-full w-full object-cover" />
                    ) : (
                      b.name.slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{b.name}</h3>
                    <p className="text-xs text-muted-foreground">{b.industry || 'Unspecified industry'}</p>
                    {b.description && <p className="text-sm mt-2 line-clamp-2 text-muted-foreground">{b.description}</p>}
                  </div>
                </div>

                <div className="flex items-center gap-4 mt-4 pt-4 border-t text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Bot className="h-3 w-3" /> {b.agent_count || 0} agents</span>
                  <span className="flex items-center gap-1"><Image className="h-3 w-3" /> {b.asset_count || 0} assets</span>
                  <span className="flex items-center gap-1"><Share2 className="h-3 w-3" /> {b.social_account_count || 0} accounts</span>
                  <ArrowRight className="h-3 w-3 ml-auto" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
