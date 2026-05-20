import { useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/appStore'
import { usePluginStore } from '@/store/pluginStore'
import { ChevronDown, Puzzle, ToggleLeft, ToggleRight } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ArrowLeft2, ArrowRight2 } from 'iconsax-react'
import { navSections, type NavSection } from './sidebarNav'

export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { sidebarCollapsed, setSidebarCollapsed, hiddenSidebarItems, sidebarSectionOrder } = useAppStore()
  const { plugins, loadPlugins, togglePlugin } = usePluginStore()
  const [pluginsExpanded, setPluginsExpanded] = useState(true)

  useEffect(() => { loadPlugins() }, [loadPlugins])

  // Apply user's section ordering and item visibility
  const orderedSections: NavSection[] = useMemo(() => {
    const hidden = new Set(hiddenSidebarItems)
    let sections = navSections
    if (sidebarSectionOrder.length > 0) {
      const indexMap = new Map(sidebarSectionOrder.map((label, i) => [label, i]))
      sections = [...navSections].sort((a, b) => {
        const ai = indexMap.has(a.label) ? indexMap.get(a.label)! : 999
        const bi = indexMap.has(b.label) ? indexMap.get(b.label)! : 999
        return ai - bi
      })
    }
    return sections
      .map(s => ({ ...s, items: s.items.filter(it => !hidden.has(it.path)) }))
      .filter(s => s.items.length > 0)
  }, [hiddenSidebarItems, sidebarSectionOrder])

  return (
    <aside
      data-sidebar
      className={cn(
        'relative flex flex-col bg-transparent transition-all duration-300 z-30 overflow-hidden shrink-0',
        sidebarCollapsed ? 'w-[60px]' : 'w-60',
      )}
    >
      {/* Logo + Collapse */}
      <div className={cn(
        'flex items-center gap-3 px-4 py-4 shrink-0',
        sidebarCollapsed && 'justify-center px-0'
      )}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/20">
          <span className="text-lg font-bold text-primary">W</span>
        </div>
        {!sidebarCollapsed && (
          <>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold leading-none truncate">WealthOS</p>
              <p className="text-xs text-muted-foreground truncate">Personal Finance</p>
            </div>
            <button
              onClick={() => setSidebarCollapsed(true)}
              className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
              title="Collapse sidebar"
            >
              <ArrowLeft2 variant="Bulk" size={16} color="currentColor" />
            </button>
          </>
        )}
      </div>

      {/* Expand button when collapsed */}
      {sidebarCollapsed && (
        <div className="px-1 pb-2 flex justify-center shrink-0">
          <button
            onClick={() => setSidebarCollapsed(false)}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
            title="Expand sidebar"
          >
            <ArrowRight2 variant="Bulk" size={16} color="currentColor" />
          </button>
        </div>
      )}

      {/* Nav */}
      <ScrollArea className="flex-1 px-2 py-2">
        {orderedSections.map((section) => (
          <div key={section.label} className="mb-2">
            {!sidebarCollapsed && (
              <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">
                {section.label}
              </p>
            )}
            {section.items.map((item) => {
              const active = location.pathname === item.path
              const Icon = item.icon
              const tourAttr = item.path === '/sidebar-customize'
                ? 'sidebar-customize-link'
                : item.path === '/theme-studio'
                  ? 'theme-studio-link'
                  : undefined
              const btn = (
                <button
                  key={item.path}
                  data-tour={tourAttr}
                  onClick={() => navigate(item.path)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-sm font-medium transition-all duration-150',
                    active
                      ? 'bg-primary/15 text-primary'
                      : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                    sidebarCollapsed && 'justify-center px-0 py-2.5'
                  )}
                >
                  <Icon variant="Bulk" size={18} color="currentColor" className="shrink-0" />
                  {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                  {!sidebarCollapsed && active && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                  )}
                </button>
              )

              if (sidebarCollapsed) {
                return (
                  <Tooltip key={item.path}>
                    <TooltipTrigger asChild>{btn}</TooltipTrigger>
                    <TooltipContent side="right">{item.label}</TooltipContent>
                  </Tooltip>
                )
              }
              return btn
            })}
          </div>
        ))}

        {/* Dynamic Plugins Section */}
        {plugins.length > 0 && (
          <div className="mb-2 mt-3">
            {!sidebarCollapsed && (
              <button
                onClick={() => setPluginsExpanded(!pluginsExpanded)}
                className="mb-1 flex w-full items-center justify-between px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50 hover:text-muted-foreground transition-colors"
              >
                <span>Plugins</span>
                <ChevronDown className={cn("h-3 w-3 transition-transform", !pluginsExpanded && "-rotate-90")} />
              </button>
            )}
            {pluginsExpanded && plugins.map((plugin) => {
              const active = location.pathname === `/plugin/${plugin.file_name}`
              const ToggleIcon = plugin.enabled ? ToggleRight : ToggleLeft
              const btn = (
                <div
                  key={plugin.id}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-sm font-medium transition-all duration-150 group',
                    active
                      ? 'bg-primary/15 text-primary'
                      : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                    !plugin.enabled && 'opacity-50',
                    sidebarCollapsed && 'justify-center px-0 py-2.5'
                  )}
                >
                  <button
                    onClick={() => navigate(`/plugin/${plugin.file_name}`)}
                    className="flex items-center gap-3 flex-1 text-left"
                  >
                    <Puzzle className="shrink-0 h-[18px] w-[18px]" />
                    {!sidebarCollapsed && <span className="truncate">{plugin.name}</span>}
                  </button>
                  {!sidebarCollapsed && (
                    <button
                      onClick={(e) => { e.stopPropagation(); togglePlugin(plugin.id, !plugin.enabled) }}
                      className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      title={plugin.enabled ? 'Disable' : 'Enable'}
                    >
                      <ToggleIcon className={cn("h-4 w-4", plugin.enabled ? "text-green-500" : "text-red-500")} />
                    </button>
                  )}
                  {!sidebarCollapsed && active && (
                    <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                  )}
                </div>
              )

              if (sidebarCollapsed) {
                return (
                  <Tooltip key={plugin.id}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => navigate(`/plugin/${plugin.file_name}`)}
                        className={cn(
                          'flex w-full items-center justify-center rounded-xl px-0 py-2.5 text-sm font-medium transition-all duration-150',
                          active ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                          !plugin.enabled && 'opacity-50'
                        )}
                      >
                        <Puzzle className="h-[18px] w-[18px]" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right">{plugin.name}</TooltipContent>
                  </Tooltip>
                )
              }
              return btn
            })}
          </div>
        )}
      </ScrollArea>
    </aside>
  )
}
