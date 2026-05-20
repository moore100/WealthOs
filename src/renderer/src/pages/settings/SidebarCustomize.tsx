import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { useAppStore } from '@/store/appStore'
import { navSections, ALWAYS_VISIBLE_PATHS } from '@/components/layout/sidebarNav'
import { Setting2, ArrowUp2, ArrowDown2, Eye, EyeSlash } from 'iconsax-react'
import { toast } from 'sonner'

export default function SidebarCustomizePage() {
  const { hiddenSidebarItems, setHiddenSidebarItems, sidebarSectionOrder, setSidebarSectionOrder } = useAppStore()
  const [filter, setFilter] = useState('')

  // Resolve effective ordered sections based on user prefs
  const orderedSections = useMemo(() => {
    if (sidebarSectionOrder.length === 0) return navSections
    const indexMap = new Map(sidebarSectionOrder.map((label, i) => [label, i]))
    return [...navSections].sort((a, b) => {
      const ai = indexMap.has(a.label) ? indexMap.get(a.label)! : 999
      const bi = indexMap.has(b.label) ? indexMap.get(b.label)! : 999
      return ai - bi
    })
  }, [sidebarSectionOrder])

  const hiddenSet = new Set(hiddenSidebarItems)
  const alwaysSet = new Set(ALWAYS_VISIBLE_PATHS)

  const toggleItem = (path: string) => {
    if (alwaysSet.has(path)) {
      toast.info('This item cannot be hidden')
      return
    }
    const next = hiddenSet.has(path)
      ? hiddenSidebarItems.filter(p => p !== path)
      : [...hiddenSidebarItems, path]
    setHiddenSidebarItems(next)
  }

  const moveSection = (label: string, direction: -1 | 1) => {
    const current = orderedSections.map(s => s.label)
    const idx = current.indexOf(label)
    if (idx === -1) return
    const newIdx = idx + direction
    if (newIdx < 0 || newIdx >= current.length) return
    const next = [...current]
    ;[next[idx], next[newIdx]] = [next[newIdx], next[idx]]
    setSidebarSectionOrder(next)
  }

  const visibleCount = navSections.reduce((sum, s) => sum + s.items.filter(i => !hiddenSet.has(i.path)).length, 0)
  const totalCount = navSections.reduce((sum, s) => sum + s.items.length, 0)

  const hideAllInSection = (label: string) => {
    const sec = navSections.find(s => s.label === label)
    if (!sec) return
    const toHide = sec.items.filter(i => !alwaysSet.has(i.path)).map(i => i.path)
    const next = Array.from(new Set([...hiddenSidebarItems, ...toHide]))
    setHiddenSidebarItems(next)
  }

  const showAllInSection = (label: string) => {
    const sec = navSections.find(s => s.label === label)
    if (!sec) return
    const paths = new Set(sec.items.map(i => i.path))
    setHiddenSidebarItems(hiddenSidebarItems.filter(p => !paths.has(p)))
  }

  const resetAll = () => {
    setHiddenSidebarItems([])
    setSidebarSectionOrder([])
    toast.success('Sidebar reset to default')
  }

  const filterLower = filter.trim().toLowerCase()
  const filterMatch = (label: string) => filterLower === '' || label.toLowerCase().includes(filterLower)

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Setting2 size={26} variant="Bulk" color="currentColor" />
            Sidebar Layout
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Show only what you use. Toggle pages off to declutter, reorder sections to your taste.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            <span className="font-bold text-primary">{visibleCount}</span> of {totalCount} pages visible
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={resetAll}>Reset to default</Button>
      </div>

      <input
        type="text"
        value={filter}
        onChange={e => setFilter(e.target.value)}
        placeholder="Search pages..."
        className="w-full h-10 rounded-lg border bg-background px-3 text-sm"
      />

      <div className="space-y-3">
        {orderedSections.map((section, sectionIdx) => {
          const visibleItemsInSection = section.items.filter(i => !hiddenSet.has(i.path))
          const allHidden = visibleItemsInSection.length === 0

          return (
            <Card key={section.label}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <span className="opacity-50">{sectionIdx + 1}.</span>
                    {section.label}
                    <span className="text-xs text-muted-foreground font-normal">
                      ({visibleItemsInSection.length}/{section.items.length})
                    </span>
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title="Move up"
                      disabled={sectionIdx === 0}
                      onClick={() => moveSection(section.label, -1)}
                    >
                      <ArrowUp2 size={14} variant="Bulk" color="currentColor" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title="Move down"
                      disabled={sectionIdx === orderedSections.length - 1}
                      onClick={() => moveSection(section.label, 1)}
                    >
                      <ArrowDown2 size={14} variant="Bulk" color="currentColor" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => allHidden ? showAllInSection(section.label) : hideAllInSection(section.label)}
                    >
                      {allHidden ? <Eye size={12} variant="Bulk" color="currentColor" /> : <EyeSlash size={12} variant="Bulk" color="currentColor" />}
                      <span className="ml-1">{allHidden ? 'Show all' : 'Hide all'}</span>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {section.items.filter(it => filterMatch(it.label)).map(item => {
                    const Icon = item.icon
                    const isHidden = hiddenSet.has(item.path)
                    const isLocked = alwaysSet.has(item.path)
                    return (
                      <div
                        key={item.path}
                        className={`flex items-center gap-3 p-2 rounded-lg border ${isHidden ? 'opacity-50 bg-muted/30' : 'bg-card'}`}
                      >
                        <Icon variant="Bulk" size={16} color="currentColor" className="shrink-0 text-muted-foreground" />
                        <span className="text-sm flex-1 truncate">{item.label}</span>
                        {isLocked ? (
                          <span className="text-[10px] text-muted-foreground italic">required</span>
                        ) : (
                          <Switch
                            checked={!isHidden}
                            onCheckedChange={() => toggleItem(item.path)}
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
