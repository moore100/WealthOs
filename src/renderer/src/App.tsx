import { useEffect, useState, lazy, Suspense } from 'react'
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from './components/ui/sonner'
import { useThemeStore } from './store/themeStore'
import { useAppStore } from './store/appStore'
import LoginPage from './pages/Login'
import type { AuthUser } from './store/appStore'
import AppLayout from './components/layout/AppLayout'
import WidgetPage from './pages/Widget'
import CommandPalette from './components/layout/CommandPalette'
import AppTour from './components/AppTour'

// Lazy-loaded pages — split each route into its own chunk
const OnboardingWizard = lazy(() => import('./pages/Onboarding'))
const DashboardPage = lazy(() => import('./pages/Dashboard'))
const NetWorthPage = lazy(() => import('./pages/NetWorth'))
const IncomePage = lazy(() => import('./pages/Income'))
const ExpensesPage = lazy(() => import('./pages/Expenses'))
const SubscriptionsPage = lazy(() => import('./pages/Subscriptions'))
const BadHabitsPage = lazy(() => import('./pages/BadHabits'))
const LoansPage = lazy(() => import('./pages/Loans'))
const PeoplePage = lazy(() => import('./pages/People'))
const GoalsPage = lazy(() => import('./pages/Goals'))
const InvestmentsPage = lazy(() => import('./pages/Investments'))
const PrioritiesPage = lazy(() => import('./pages/investments/Priorities'))
const BudgetPage = lazy(() => import('./pages/Budget'))
const DateBudgetsPage = lazy(() => import('./pages/DateBudgets'))
const MoodPage = lazy(() => import('./pages/Mood'))
const PayingPeoplePage = lazy(() => import('./pages/PayingPeople'))
const AIChatPage = lazy(() => import('./pages/AIChat'))
const AIInsightsPage = lazy(() => import('./pages/AIInsights'))
const HealthScorePage = lazy(() => import('./pages/HealthScore'))
const ThemeStudioPage = lazy(() => import('./pages/settings/ThemeStudio'))
const ProfilePage = lazy(() => import('./pages/settings/Profile'))
const CategoriesPage = lazy(() => import('./pages/settings/Categories'))
const AIProviderPage = lazy(() => import('./pages/settings/AIProvider'))
const AIPersonalityPage = lazy(() => import('./pages/settings/AIPersonality'))
const DataPage = lazy(() => import('./pages/settings/Data'))
const VaultSyncPage = lazy(() => import('./pages/settings/VaultSync'))
const RemindersPage = lazy(() => import('./pages/Reminders'))
const PluginsPage = lazy(() => import('./pages/Plugins'))
const WhatIfPage = lazy(() => import('./pages/WhatIf'))
const BillCalendarPage = lazy(() => import('./pages/BillCalendar'))
const AnomaliesPage = lazy(() => import('./pages/Anomalies'))
const HouseholdPage = lazy(() => import('./pages/Household'))
const PluginWidgetPage = lazy(() => import('./pages/PluginWidgetPage'))
const TimelinePage = lazy(() => import('./pages/Timeline'))
const PurchaseAdvisorPage = lazy(() => import('./pages/PurchaseAdvisor'))
const BenchmarksPage = lazy(() => import('./pages/Benchmarks'))
const StreaksPage = lazy(() => import('./pages/Streaks'))
const SubscriptionKillerPage = lazy(() => import('./pages/SubscriptionKiller'))
const WindfallPage = lazy(() => import('./pages/Windfall'))
const ReceiptSplitPage = lazy(() => import('./pages/ReceiptSplit'))
const MemoirPage = lazy(() => import('./pages/Memoir'))
const MorningBriefingPage = lazy(() => import('./pages/MorningBriefing'))
const RetailTherapyPage = lazy(() => import('./pages/RetailTherapy'))
const NetWorthHistoryPage = lazy(() => import('./pages/NetWorthHistory'))
const TaxPlannerPage = lazy(() => import('./pages/TaxPlanner'))
const DocumentVaultPage = lazy(() => import('./pages/DocumentVault'))
const WishlistPage = lazy(() => import('./pages/Wishlist'))
const CashFlowForecastPage = lazy(() => import('./pages/CashFlowForecast'))
const SinkingFundsPage = lazy(() => import('./pages/SinkingFunds'))
const RecurringDetectPage = lazy(() => import('./pages/RecurringDetect'))
const YearEndReportPage = lazy(() => import('./pages/YearEndReport'))
const BackupPage = lazy(() => import('./pages/settings/Backup'))
const MultiCurrencyPage = lazy(() => import('./pages/settings/MultiCurrency'))
const RegretTrackerPage = lazy(() => import('./pages/RegretTracker'))
const TimeMachinePage = lazy(() => import('./pages/TimeMachine'))
const CoupleSyncPage = lazy(() => import('./pages/CoupleSync'))
const SidebarCustomizePage = lazy(() => import('./pages/settings/SidebarCustomize'))
const ISPPage = lazy(() => import('./pages/ISP'))
const DebtPayoffPage = lazy(() => import('./pages/DebtPayoff'))
const EmergencyFundPage = lazy(() => import('./pages/EmergencyFund'))
const PaymentChannelsPage = lazy(() => import('./pages/PaymentChannels'))
const SavingsGoalDetailPage = lazy(() => import('./pages/SavingsGoalDetail'))
const SavingsIntentionsPage = lazy(() => import('./pages/SavingsIntentions'))
const TradingPage = lazy(() => import('./pages/Trading'))

function PageFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center p-8">
      <div className="flex items-center gap-3 text-muted-foreground">
        <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <span className="text-sm">Loading...</span>
      </div>
    </div>
  )
}

export default function App() {
  const { loadFromStore } = useThemeStore()
  const { loadSettings, isOnboarded, setCurrentUser, currentUser } = useAppStore()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      await loadFromStore()
      const session = await window.api?.auth?.getSession().catch(() => null)
      if (session) {
        setCurrentUser(session)
        await loadSettings()
      }
      setLoading(false)
    }
    init()
  }, [])

  const handleLogin = async (user: AuthUser) => {
    setCurrentUser(user)
    await loadSettings()
  }

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-16 w-16 rounded-2xl bg-primary/20 flex items-center justify-center">
              <span className="text-3xl font-bold text-primary">W</span>
            </div>
            <div className="absolute inset-0 rounded-2xl border-2 border-primary/40 animate-ping" />
          </div>
          <p className="text-sm text-muted-foreground animate-pulse">Loading WealthOS...</p>
        </div>
      </div>
    )
  }

  // Widget mode — render standalone without layout/router
  if (window.location.hash === '#widget') {
    return <WidgetPage />
  }

  if (!currentUser) {
    return (
      <>
        <LoginPage onLogin={handleLogin} />
        <Toaster richColors position="top-right" />
      </>
    )
  }

  return (
    <MemoryRouter initialEntries={[isOnboarded ? '/dashboard' : '/onboarding']}>
      <CommandPalette />
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/onboarding" element={<OnboardingWizard />} />
          <Route path="/" element={<AppLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="net-worth" element={<NetWorthPage />} />
            <Route path="income" element={<IncomePage />} />
            <Route path="expenses" element={<ExpensesPage />} />
            <Route path="subscriptions" element={<SubscriptionsPage />} />
            <Route path="bad-habits" element={<BadHabitsPage />} />
            <Route path="loans" element={<LoansPage />} />
            <Route path="people" element={<PeoplePage />} />
            <Route path="goals" element={<GoalsPage />} />
            <Route path="savings/:id" element={<SavingsGoalDetailPage />} />
            <Route path="investments" element={<InvestmentsPage />} />
            <Route path="priorities" element={<PrioritiesPage />} />
            <Route path="budget" element={<BudgetPage />} />
            <Route path="date-budgets" element={<DateBudgetsPage />} />
            <Route path="mood" element={<MoodPage />} />
            <Route path="paying-people" element={<PayingPeoplePage />} />
            <Route path="ai-chat" element={<AIChatPage />} />
            <Route path="ai-insights" element={<AIInsightsPage />} />
            <Route path="health-score" element={<HealthScorePage />} />
            <Route path="theme-studio" element={<ThemeStudioPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="categories" element={<CategoriesPage />} />
            <Route path="openai-key" element={<AIProviderPage />} />
            <Route path="ai-provider" element={<AIProviderPage />} />
            <Route path="ai-personality" element={<AIPersonalityPage />} />
            <Route path="data" element={<DataPage />} />
            <Route path="vault-sync" element={<VaultSyncPage />} />
            <Route path="reminders" element={<RemindersPage />} />
            <Route path="plugins" element={<PluginsPage />} />
            <Route path="plugin/:fileName" element={<PluginWidgetPage />} />
            <Route path="simulator" element={<WhatIfPage />} />
            <Route path="bill-calendar" element={<BillCalendarPage />} />
            <Route path="anomalies" element={<AnomaliesPage />} />
            <Route path="household" element={<HouseholdPage />} />
            <Route path="timeline" element={<TimelinePage />} />
            <Route path="purchase-advisor" element={<PurchaseAdvisorPage />} />
            <Route path="benchmarks" element={<BenchmarksPage />} />
            <Route path="streaks" element={<StreaksPage />} />
            <Route path="subscription-killer" element={<SubscriptionKillerPage />} />
            <Route path="windfall" element={<WindfallPage />} />
            <Route path="receipt-split" element={<ReceiptSplitPage />} />
            <Route path="memoir" element={<MemoirPage />} />
            <Route path="morning-briefing" element={<MorningBriefingPage />} />
            <Route path="retail-therapy" element={<RetailTherapyPage />} />
            <Route path="net-worth-history" element={<NetWorthHistoryPage />} />
            <Route path="tax-planner" element={<TaxPlannerPage />} />
            <Route path="document-vault" element={<DocumentVaultPage />} />
            <Route path="wishlist" element={<WishlistPage />} />
            <Route path="cash-flow" element={<CashFlowForecastPage />} />
            <Route path="sinking-funds" element={<SinkingFundsPage />} />
            <Route path="recurring-detect" element={<RecurringDetectPage />} />
            <Route path="year-end-report" element={<YearEndReportPage />} />
            <Route path="backup" element={<BackupPage />} />
            <Route path="multi-currency" element={<MultiCurrencyPage />} />
            <Route path="widget" element={<WidgetPage />} />
            <Route path="regret" element={<RegretTrackerPage />} />
            <Route path="time-machine" element={<TimeMachinePage />} />
            <Route path="couple" element={<CoupleSyncPage />} />
            <Route path="sidebar-customize" element={<SidebarCustomizePage />} />
            <Route path="isp" element={<ISPPage />} />
            <Route path="debt-payoff" element={<DebtPayoffPage />} />
            <Route path="emergency-fund" element={<EmergencyFundPage />} />
            <Route path="payment-channels" element={<PaymentChannelsPage />} />
            <Route path="savings-intentions" element={<SavingsIntentionsPage />} />
            <Route path="trading" element={<TradingPage />} />
          </Route>
        </Routes>
      </Suspense>
      <AppTour />
      <Toaster richColors position="top-right" />
    </MemoryRouter>
  )
}
