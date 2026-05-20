import { useEffect, useState } from 'react'
import { Image, Sparkles, Palette } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface Asset {
  id: number
  type: string
  name: string
  thumbnail_path: string | null
  width: number | null
  height: number | null
  updated_at: string
}

export default function BusinessAssetsTab({ businessId }: { businessId: number }) {
  const [assets, setAssets] = useState<Asset[]>([])

  useEffect(() => {
    (async () => {
      const data = await (window as any).api?.businesses?.assets?.list(businessId)
      setAssets(data || [])
    })()
  }, [businessId])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Design Assets</h3>
          <p className="text-xs text-muted-foreground">Posters, t-shirts, social posts — designed by you or AI</p>
        </div>
      </div>

      <Card className="border-dashed border-primary/30 bg-primary/5">
        <CardContent className="py-8 text-center space-y-3">
          <Palette className="mx-auto h-10 w-10 text-primary/60" />
          <div>
            <p className="font-medium">Design Canvas — Coming in Phase 3</p>
            <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1">
              Fabric.js canvas with templates (Instagram, t-shirts, posters), AI image generation via DALL·E 3, background removal, and PNG/PDF/SVG export.
            </p>
          </div>
          <Button size="sm" disabled><Sparkles className="mr-2 h-3 w-3" /> Open Canvas</Button>
        </CardContent>
      </Card>

      {assets.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {assets.map(a => (
            <Card key={a.id}>
              <CardContent className="p-3">
                <div className="aspect-square bg-muted rounded mb-2 flex items-center justify-center">
                  <Image className="h-8 w-8 text-muted-foreground/40" />
                </div>
                <p className="text-xs font-medium truncate">{a.name}</p>
                <p className="text-xs text-muted-foreground">{a.type}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
