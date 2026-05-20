import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Bot, BookOpen, TrendingUp, Image, Share2, Settings, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import type { Business } from '@/store/businessStore'
import BusinessOverviewTab from '@/components/business/BusinessOverviewTab'
import BusinessAgentsTab from '@/components/business/BusinessAgentsTab'
import BusinessKnowledgeTab from '@/components/business/BusinessKnowledgeTab'
import BusinessMetricsTab from '@/components/business/BusinessMetricsTab'
import BusinessAssetsTab from '@/components/business/BusinessAssetsTab'
import BusinessSocialTab from '@/components/business/BusinessSocialTab'
import BusinessSettingsTab from '@/components/business/BusinessSettingsTab'

export default function BusinessDashboardPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const businessId = Number(id)
  const [business, setBusiness] = useState<Business | null>(null)
  const [logoData, setLogoData] = useState<string | null>(null)
  const [tab, setTab] = useState('overview')

  useEffect(() => {
    const load = async () => {
      const b = await (window as any).api?.businesses?.get(businessId)
      setBusiness(b)
      if (b?.logo_path) {
        const data = await (window as any).api?.businesses?.getLogo(businessId)
        setLogoData(data)
      }
    }
    load()
  }, [businessId])

  if (!business) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading business...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/businesses')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <div
          className="h-16 w-16 rounded-xl flex items-center justify-center text-white text-xl font-bold shrink-0 overflow-hidden"
          style={{ background: business.brand_color || '#3b82f6' }}
        >
          {logoData ? (
            <img src={logoData} alt={business.name} className="h-full w-full object-cover" />
          ) : business.name ? business.name.slice(0, 2).toUpperCase() : <Building2 className="h-8 w-8" />}
        </div>

        <div className="flex-1">
          <h2 className="text-2xl font-bold">{business.name}</h2>
          <p className="text-sm text-muted-foreground">
            {business.industry || 'Business'} {business.website && `· ${business.website}`}
          </p>
          {business.description && <p className="text-sm mt-1">{business.description}</p>}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-7 w-full">
          <TabsTrigger value="overview"><Building2 className="mr-1 h-3 w-3" /> Overview</TabsTrigger>
          <TabsTrigger value="agents"><Bot className="mr-1 h-3 w-3" /> AI Team</TabsTrigger>
          <TabsTrigger value="knowledge"><BookOpen className="mr-1 h-3 w-3" /> Knowledge</TabsTrigger>
          <TabsTrigger value="metrics"><TrendingUp className="mr-1 h-3 w-3" /> Metrics</TabsTrigger>
          <TabsTrigger value="assets"><Image className="mr-1 h-3 w-3" /> Assets</TabsTrigger>
          <TabsTrigger value="social"><Share2 className="mr-1 h-3 w-3" /> Social</TabsTrigger>
          <TabsTrigger value="settings"><Settings className="mr-1 h-3 w-3" /> Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <BusinessOverviewTab business={business} onTabChange={setTab} />
        </TabsContent>
        <TabsContent value="agents" className="mt-6">
          <BusinessAgentsTab businessId={businessId} />
        </TabsContent>
        <TabsContent value="knowledge" className="mt-6">
          <BusinessKnowledgeTab businessId={businessId} />
        </TabsContent>
        <TabsContent value="metrics" className="mt-6">
          <BusinessMetricsTab businessId={businessId} />
        </TabsContent>
        <TabsContent value="assets" className="mt-6">
          <BusinessAssetsTab businessId={businessId} />
        </TabsContent>
        <TabsContent value="social" className="mt-6">
          <BusinessSocialTab businessId={businessId} />
        </TabsContent>
        <TabsContent value="settings" className="mt-6">
          <BusinessSettingsTab business={business} onUpdated={(b: Business) => setBusiness(b)} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
