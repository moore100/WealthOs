import { useEffect, useState } from 'react'
import { Bot, BookOpen, TrendingUp, Image, Share2, Sparkles } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { Business } from '@/store/businessStore'

interface Props { business: Business; onTabChange: (tab: string) => void }

export default function BusinessOverviewTab({ business, onTabChange }: Props) {
  const [stats, setStats] = useState({ agents: 0, kb: 0, metrics: 0, assets: 0, social: 0, posts: 0 })

  useEffect(() => {
    const load = async () => {
      const api = (window as any).api?.businesses
      if (!api) return
      const [agents, kb, metrics, assets, social, posts] = await Promise.all([
        api.agents.list(business.id),
        api.kb.list(business.id),
        api.metrics.list(business.id),
        api.assets.list(business.id),
        api.social.list(business.id),
        api.posts.list(business.id),
      ])
      setStats({
        agents: agents?.length || 0,
        kb: kb?.length || 0,
        metrics: metrics?.length || 0,
        assets: assets?.length || 0,
        social: social?.length || 0,
        posts: posts?.length || 0,
      })
    }
    load()
  }, [business.id])

  const cards = [
    { key: 'agents', label: 'AI Team Members', value: stats.agents, icon: Bot, color: 'text-purple-500', tab: 'agents' },
    { key: 'kb', label: 'Knowledge Entries', value: stats.kb, icon: BookOpen, color: 'text-blue-500', tab: 'knowledge' },
    { key: 'metrics', label: 'Metrics Logged', value: stats.metrics, icon: TrendingUp, color: 'text-green-500', tab: 'metrics' },
    { key: 'assets', label: 'Design Assets', value: stats.assets, icon: Image, color: 'text-pink-500', tab: 'assets' },
    { key: 'social', label: 'Social Accounts', value: stats.social, icon: Share2, color: 'text-cyan-500', tab: 'social' },
    { key: 'posts', label: 'Posts Created', value: stats.posts, icon: Sparkles, color: 'text-amber-500', tab: 'social' },
  ]

  return (
    <div className="space-y-6">
      {/* Mission */}
      {business.mission && (
        <Card>
          <CardContent className="p-5">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-2">Mission</h3>
            <p className="text-sm">{business.mission}</p>
          </CardContent>
        </Card>
      )}

      {business.target_audience && (
        <Card>
          <CardContent className="p-5">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-2">Target Audience</h3>
            <p className="text-sm">{business.target_audience}</p>
          </CardContent>
        </Card>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {cards.map(c => {
          const Icon = c.icon
          return (
            <Card key={c.key} className="cursor-pointer hover:border-primary/50" onClick={() => onTabChange(c.tab)}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <Icon className={`h-5 w-5 ${c.color}`} />
                  <span className="text-2xl font-bold">{c.value}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">{c.label}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Quick actions */}
      <Card>
        <CardContent className="p-5 space-y-3">
          <h3 className="font-semibold">Quick Actions</h3>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => onTabChange('agents')}>
              <Bot className="mr-2 h-3 w-3" /> Spawn AI Agent
            </Button>
            <Button size="sm" variant="outline" onClick={() => onTabChange('knowledge')}>
              <BookOpen className="mr-2 h-3 w-3" /> Add Knowledge
            </Button>
            <Button size="sm" variant="outline" onClick={() => onTabChange('assets')}>
              <Image className="mr-2 h-3 w-3" /> Design Asset
            </Button>
            <Button size="sm" variant="outline" onClick={() => onTabChange('metrics')}>
              <TrendingUp className="mr-2 h-3 w-3" /> Log Metric
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
