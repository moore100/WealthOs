import { useEffect, useState } from 'react'
import { Share2, Twitter, Instagram, Linkedin, Facebook } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const PLATFORMS = [
  { key: 'twitter', label: 'Twitter / X', icon: Twitter, color: 'text-sky-500' },
  { key: 'instagram', label: 'Instagram', icon: Instagram, color: 'text-pink-500' },
  { key: 'linkedin', label: 'LinkedIn', icon: Linkedin, color: 'text-blue-700' },
  { key: 'facebook', label: 'Facebook', icon: Facebook, color: 'text-blue-600' },
]

export default function BusinessSocialTab({ businessId }: { businessId: number }) {
  const [accounts, setAccounts] = useState<any[]>([])
  const [posts, setPosts] = useState<any[]>([])

  useEffect(() => {
    (async () => {
      const [a, p] = await Promise.all([
        (window as any).api?.businesses?.social?.list(businessId),
        (window as any).api?.businesses?.posts?.list(businessId),
      ])
      setAccounts(a || [])
      setPosts(p || [])
    })()
  }, [businessId])

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold">Social Media</h3>
        <p className="text-xs text-muted-foreground">Connect platforms, schedule posts, let AI manage your presence</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {PLATFORMS.map(p => {
          const Icon = p.icon
          const connected = accounts.find(a => a.platform === p.key && a.is_active)
          return (
            <Card key={p.key}>
              <CardContent className="p-4 text-center">
                <Icon className={`mx-auto h-8 w-8 ${p.color} mb-2`} />
                <p className="text-sm font-medium">{p.label}</p>
                <p className="text-xs text-muted-foreground mb-2">{connected ? `@${connected.account_handle}` : 'Not connected'}</p>
                <Button size="sm" variant={connected ? 'outline' : 'default'} disabled className="w-full">
                  {connected ? 'Connected' : 'Connect'}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card className="border-dashed border-primary/30 bg-primary/5">
        <CardContent className="py-6 text-center space-y-2">
          <Share2 className="mx-auto h-8 w-8 text-primary/60" />
          <p className="font-medium text-sm">Social Integration — Coming in Phase 4</p>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            OAuth connection for all platforms, AI-managed posting schedules, encrypted token storage,
            engagement tracking, and auto-post mode.
          </p>
        </CardContent>
      </Card>

      {posts.length > 0 && (
        <div>
          <h4 className="font-semibold text-sm mb-2">Recent Posts ({posts.length})</h4>
          <div className="space-y-2">
            {posts.slice(0, 5).map(p => (
              <Card key={p.id}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <span className="capitalize">{p.platform}</span>
                    <span>·</span>
                    <span className="capitalize">{p.status}</span>
                    {p.scheduled_at && <span>· {p.scheduled_at}</span>}
                  </div>
                  <p className="text-sm line-clamp-2">{p.content_text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
