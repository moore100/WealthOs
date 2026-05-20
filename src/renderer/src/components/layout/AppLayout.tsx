import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { useAppStore } from '@/store/appStore'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import GlobalAIButton from '@/components/GlobalAIButton'
import ErrorBoundary from '@/components/ErrorBoundary'
import { TooltipProvider } from '@/components/ui/tooltip'

export default function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { setCurrentPage } = useAppStore()

  useEffect(() => {
    setCurrentPage(location.pathname)
  }, [location.pathname])

  useEffect(() => {
    const unsub = window.api?.onNavigate((path) => navigate(path))
    return () => unsub?.()
  }, [navigate])

  return (
    <TooltipProvider delayDuration={300}>
      <div id="app-root" className="relative flex h-screen w-screen overflow-hidden bg-background text-foreground p-3 gap-3">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-border/50 bg-card shadow-xl">
          <Topbar />
          <main className="flex-1 overflow-y-auto p-6 bg-background/40">
            <ErrorBoundary resetKey={location.pathname}>
              <Outlet />
            </ErrorBoundary>
          </main>
          <GlobalAIButton />
        </div>
      </div>
    </TooltipProvider>
  )
}
