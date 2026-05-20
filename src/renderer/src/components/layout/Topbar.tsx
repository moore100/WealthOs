import { useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { Notification, SearchNormal1, Sun1, Moon, Monitor, LogoutCurve, Setting2, ColorSwatch, ProfileCircle, Key, Data, Tag, MagicStar } from 'iconsax-react'
import { Minus, Square, X, Bell, PanelRightClose, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/store/appStore'
import { useThemeStore } from '@/store/themeStore'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu'
import DailyBriefing from '@/components/DailyBriefing'
import CanIAffordModal from '@/components/CanIAffordModal'

const routeLabels: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/net-worth': 'Net Worth',
  '/income': 'Income',
  '/expenses': 'Expenses',
  '/subscriptions': 'Subscriptions',
  '/bad-habits': 'Bad Habits',
  '/loans': 'Loans & Debt',
  '/people': 'People',
  '/paying-people': 'Paying People',
  '/goals': 'Savings Goals',
  '/investments': 'Investments',
  '/priorities': 'Priorities',
  '/budget': 'Budget Planner',
  '/date-budgets': 'Date Budgets',
  '/mood': 'Financial Mood',
  '/ai-chat': 'AI Chat',
  '/ai-insights': 'AI Insights',
  '/health-score': 'Health Score',
  '/reminders': 'Reminders',
  '/theme-studio': 'Theme Studio',
  '/profile': 'Profile',
  '/categories': 'Categories',
  '/openai-key': 'AI Provider',
  '/ai-provider': 'AI Provider',
  '/ai-personality': 'AI Personality',
  '/data': 'Data',
  '/vault-sync': 'Vault Sync',
  '/plugins': 'Plugins',
  '/simulator': 'What-If Simulator',
  '/bill-calendar': 'Bill Calendar',
  '/anomalies': 'Spending Anomalies',
  '/household': 'Household',
  '/timeline': 'Life Timeline',
  '/purchase-advisor': 'Purchase Future-You',
  '/benchmarks': 'Peer Benchmarks',
  '/streaks': 'Financial Streaks',
  '/subscription-killer': 'Subscription Killer',
  '/windfall': 'Windfall Auto-Pilot',
  '/receipt-split': 'Smart Receipt Split',
  '/memoir': 'Financial Memoir',
  '/morning-briefing': 'Morning Briefing',
  '/retail-therapy': 'Retail Therapy Guard',
  '/net-worth-history': 'Net Worth History',
  '/tax-planner': 'Tax Planner',
  '/document-vault': 'Document Vault',
  '/wishlist': 'Wishlist',
  '/cash-flow': 'Cash Flow Forecast',
  '/sinking-funds': 'Sinking Funds',
  '/recurring-detect': 'Recurring Detect',
  '/year-end-report': 'Year-End Report',
  '/backup': 'Encrypted Backup',
  '/multi-currency': 'Multi-Currency',
  '/regret': 'Regret Tracker',
  '/time-machine': 'Time Machine',
  '/couple': 'Couple Sync',
  '/trading': 'AI Trading',
  '/sidebar-customize': 'Sidebar Layout',
}

function getPageTitle(path: string): string {
  if (routeLabels[path]) return routeLabels[path]
  if (path.startsWith('/plugin/')) {
    const name = path.split('/').pop() || 'Plugin'
    return name.replace(/\.plugin\.js$/, '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }
  return 'WealthOS'
}

export default function Topbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { setCommandPaletteOpen, currentUser, setCurrentUser, setTourActive } = useAppStore()
  const { theme, setTheme } = useThemeStore()
  const [briefingOpen, setBriefingOpen] = useState(false)
  const [affordOpen, setAffordOpen] = useState(false)

  const handleLogout = async () => {
    await window.api?.auth?.logout().catch(() => {})
    setCurrentUser(null)
  }

  const initials = currentUser
    ? (currentUser.displayName || currentUser.username).slice(0, 2).toUpperCase()
    : '?'
  const pageTitle = getPageTitle(location.pathname)

  const handleWindowControl = (action: 'minimize' | 'maximize' | 'close') => {
    window.api?.window[action]()
  }

  const cycleMode = () => {
    const modes = ['dark', 'light', 'system'] as const
    const idx = modes.indexOf(theme.mode as typeof modes[number])
    const next = modes[(idx + 1) % modes.length]
    setTheme({ mode: next })
  }

  const ModeIcon = theme.mode === 'dark' ? Moon : theme.mode === 'light' ? Sun1 : Monitor

  return (
    <header className="app-drag flex h-12 shrink-0 items-center border-b border-border/50 bg-card px-4 gap-3">
      {/* Page title */}
      <h1 className="app-no-drag text-sm font-semibold text-foreground">{pageTitle}</h1>

      <div className="flex-1" />

      {/* Search shortcut */}
      <button
        className="app-no-drag flex items-center gap-2 rounded-lg border border-border/50 bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors"
        onClick={() => setCommandPaletteOpen(true)}
      >
        <SearchNormal1 size={12} variant="Bulk" color="currentColor" />
        <span>Search...</span>
        <kbd className="rounded bg-background px-1 text-[10px]">⌘K</kbd>
      </button>

      {/* Can I Afford This */}
      <Button variant="ghost" size="sm" className="app-no-drag h-8 text-muted-foreground gap-1.5 text-xs" onClick={() => setAffordOpen(true)}>
        <Wallet className="h-3.5 w-3.5" />
        Can I Afford?
      </Button>
      <CanIAffordModal open={affordOpen} onClose={() => setAffordOpen(false)} />

      {/* Mode toggle */}
      <Button variant="ghost" size="icon" className="app-no-drag h-8 w-8 text-muted-foreground" onClick={cycleMode}>
        <ModeIcon size={16} variant="Bulk" color="currentColor" />
      </Button>

      {/* Notifications */}
      <Button variant="ghost" size="icon" className="app-no-drag h-8 w-8 text-muted-foreground relative" onClick={() => setBriefingOpen(!briefingOpen)}>
        <Notification size={16} variant="Bulk" color="currentColor" />
        <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
      </Button>

      {/* Settings cog */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="app-no-drag h-8 w-8 text-muted-foreground"
            title="Settings"
            data-tour="settings-cog"
          >
            <Setting2 size={16} variant="Bulk" color="currentColor" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal text-xs text-muted-foreground uppercase tracking-wider">
            Customize
          </DropdownMenuLabel>
          <DropdownMenuItem onClick={() => navigate('/theme-studio')} className="gap-2">
            <ColorSwatch size={14} variant="Bulk" color="currentColor" />
            Theme Studio
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('/sidebar-customize')} className="gap-2">
            <Setting2 size={14} variant="Bulk" color="currentColor" />
            Sidebar Layout
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="font-normal text-xs text-muted-foreground uppercase tracking-wider">
            Settings
          </DropdownMenuLabel>
          <DropdownMenuItem onClick={() => navigate('/profile')} className="gap-2">
            <ProfileCircle size={14} variant="Bulk" color="currentColor" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('/categories')} className="gap-2">
            <Tag size={14} variant="Bulk" color="currentColor" />
            Categories
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('/openai-key')} className="gap-2">
            <Key size={14} variant="Bulk" color="currentColor" />
            AI Provider
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('/data')} className="gap-2">
            <Data size={14} variant="Bulk" color="currentColor" />
            Data
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setTourActive(true)} className="gap-2">
            <MagicStar size={14} variant="Bulk" color="currentColor" />
            Take the tour
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="app-no-drag flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary hover:bg-primary/30 transition-colors shrink-0">
            {initials}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel className="font-normal">
            <p className="text-sm font-semibold">{currentUser?.displayName}</p>
            <p className="text-xs text-muted-foreground">@{currentUser?.username}</p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive gap-2">
            <LogoutCurve size={14} variant="Bulk" color="currentColor" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Window controls */}
      <div className="app-no-drag flex items-center ml-3 border-l border-border/50 pl-3 gap-0.5">
        <button
          onClick={() => handleWindowControl('minimize')}
          title="Minimize"
          className="h-8 w-10 flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors rounded-sm"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => handleWindowControl('maximize')}
          title="Maximize"
          className="h-8 w-10 flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors rounded-sm"
        >
          <Square className="h-3 w-3" />
        </button>
        <button
          onClick={() => handleWindowControl('close')}
          title="Close"
          className="h-8 w-10 flex items-center justify-center text-muted-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors rounded-sm"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Daily Briefing Slide-over Panel */}
      {briefingOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            onClick={() => setBriefingOpen(false)}
          />
          {/* Panel */}
          <div className="fixed top-12 right-0 bottom-0 w-[380px] max-w-[90vw] z-50 bg-card border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Daily Briefing</h3>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setBriefingOpen(false)}>
                <PanelRightClose className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <DailyBriefing />
            </div>
          </div>
        </>
      )}
    </header>
  )
}
