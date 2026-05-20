import { useEffect, useState } from 'react'
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from './components/ui/sonner'
import { useThemeStore } from './store/themeStore'
import { useAppStore } from './store/appStore'
import LoginPage from './pages/Login'
import type { AuthUser } from './store/appStore'
import AppLayout from './components/layout/AppLayout'
import OnboardingWizard from './pages/Onboarding'
import DashboardPage from './pages/Dashboard'
import NetWorthPage from './pages/NetWorth'
import IncomePage from './pages/Income'
import ExpensesPage from './pages/Expenses'
import SubscriptionsPage from './pages/Subscriptions'
import BadHabitsPage from './pages/BadHabits'
import LoansPage from './pages/Loans'
import PeoplePage from './pages/People'
import GoalsPage from './pages/Goals'
import InvestmentsPage from './pages/Investments'
import PrioritiesPage from './pages/investments/Priorities'
import BudgetPage from './pages/Budget'
import DateBudgetsPage from './pages/DateBudgets'
import MoodPage from './pages/Mood'
import PayingPeoplePage from './pages/PayingPeople'
import AIChatPage from './pages/AIChat'
import AIInsightsPage from './pages/AIInsights'
import HealthScorePage from './pages/HealthScore'
import ThemeStudioPage from './pages/settings/ThemeStudio'
import ProfilePage from './pages/settings/Profile'
import CategoriesPage from './pages/settings/Categories'
import AIProviderPage from './pages/settings/AIProvider'
import AIPersonalityPage from './pages/settings/AIPersonality'
import DataPage from './pages/settings/Data'
import VaultSyncPage from './pages/settings/VaultSync'
import RemindersPage from './pages/Reminders'
import PluginsPage from './pages/Plugins'
import WhatIfPage from './pages/WhatIf'
import BillCalendarPage from './pages/BillCalendar'
import AnomaliesPage from './pages/Anomalies'
import HouseholdPage from './pages/Household'
import PluginWidgetPage from './pages/PluginWidgetPage'
import CommandPalette from './components/layout/CommandPalette'
import TimelinePage from './pages/Timeline'
import PurchaseAdvisorPage from './pages/PurchaseAdvisor'
import BenchmarksPage from './pages/Benchmarks'
import StreaksPage from './pages/Streaks'
import SubscriptionKillerPage from './pages/SubscriptionKiller'
import WindfallPage from './pages/Windfall'
import ReceiptSplitPage from './pages/ReceiptSplit'
import MemoirPage from './pages/Memoir'
import MorningBriefingPage from './pages/MorningBriefing'
import RetailTherapyPage from './pages/RetailTherapy'
import NetWorthHistoryPage from './pages/NetWorthHistory'
import TaxPlannerPage from './pages/TaxPlanner'
import DocumentVaultPage from './pages/DocumentVault'
import WishlistPage from './pages/Wishlist'
import CashFlowForecastPage from './pages/CashFlowForecast'
import SinkingFundsPage from './pages/SinkingFunds'
import RecurringDetectPage from './pages/RecurringDetect'
import YearEndReportPage from './pages/YearEndReport'
import BackupPage from './pages/settings/Backup'
import MultiCurrencyPage from './pages/settings/MultiCurrency'
import WidgetPage from './pages/Widget'
import RegretTrackerPage from './pages/RegretTracker'
import TimeMachinePage from './pages/TimeMachine'
import CoupleSyncPage from './pages/CoupleSync'
import SidebarCustomizePage from './pages/settings/SidebarCustomize'
import ISPPage from './pages/ISP'
import DebtPayoffPage from './pages/DebtPayoff'
import EmergencyFundPage from './pages/EmergencyFund'
import PaymentChannelsPage from './pages/PaymentChannels'
import SavingsGoalDetailPage from './pages/SavingsGoalDetail'
import SavingsIntentionsPage from './pages/SavingsIntentions'
import TradingPage from './pages/Trading'
import AppTour from './components/AppTour'

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
      <AppTour />
      <Toaster richColors position="top-right" />
    </MemoryRouter>
  )
}
