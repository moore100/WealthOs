import { useEffect, useState, useMemo } from 'react'
import { useAppStore } from '@/store/appStore'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import { MagicStar } from 'iconsax-react'

interface TourStep {
  selector?: string
  title: string
  description: string
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center'
}

const TOUR_STEPS: TourStep[] = [
  {
    title: 'Welcome to WealthOS 👋',
    description: 'Your private, offline financial command center. Let me show you around in just a few clicks.',
    placement: 'center',
  },
  {
    selector: '[data-sidebar]',
    title: 'Your Sidebar',
    description: 'All your pages live here. We\'ve enabled the essentials by default — Dashboard, Income, Expenses, Goals, AI Chat, and more. You can enable extras anytime.',
    placement: 'right',
  },
  {
    selector: '[data-tour="settings-cog"]',
    title: 'Settings & Customization',
    description: 'Click the cog anytime to jump straight to Theme Studio, Sidebar Layout, your profile, or settings. You can also re-run this tour from here.',
    placement: 'bottom',
  },
  {
    selector: '[data-tour="sidebar-customize-link"]',
    title: 'Customize Your Sidebar',
    description: 'WealthOS has 70+ pages. Show only what matters to you — hide pages you don\'t use, reorder sections, or reset to defaults.',
    placement: 'right',
  },
  {
    selector: '[data-tour="theme-studio-link"]',
    title: 'Make It Yours',
    description: 'Theme Studio lets you tweak colors, fonts, and the look of every screen. Pure expression.',
    placement: 'right',
  },
  {
    title: 'You\'re all set! 🚀',
    description: 'Start by logging your first income or expense. The Dashboard updates in real-time. Need help? Click the settings cog → "Take the tour" anytime.',
    placement: 'center',
  },
]

interface Rect {
  top: number
  left: number
  width: number
  height: number
}

function getElementRect(selector: string): Rect | null {
  const el = document.querySelector(selector) as HTMLElement | null
  if (!el) return null
  const r = el.getBoundingClientRect()
  return { top: r.top, left: r.left, width: r.width, height: r.height }
}

export default function AppTour() {
  const { tourActive, completeTour } = useAppStore()
  const [stepIndex, setStepIndex] = useState(0)
  const [rect, setRect] = useState<Rect | null>(null)
  const [, force] = useState(0)

  // Reset on tour open
  useEffect(() => {
    if (tourActive) setStepIndex(0)
  }, [tourActive])

  const step = TOUR_STEPS[stepIndex]

  // Recompute target rect
  useEffect(() => {
    if (!tourActive || !step) return
    const update = () => {
      if (step.selector) {
        setRect(getElementRect(step.selector))
      } else {
        setRect(null)
      }
    }
    update()
    const t = setTimeout(update, 60)
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      clearTimeout(t)
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [tourActive, stepIndex, step])

  // Force redraw on transitions
  useEffect(() => {
    const i = setInterval(() => force(x => x + 1), 500)
    return () => clearInterval(i)
  }, [])

  const popoverStyle = useMemo<React.CSSProperties>(() => {
    if (!step) return {}
    if (!rect || step.placement === 'center' || !step.selector) {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      }
    }
    const pad = 16
    const popW = 360
    const popH = 200
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    let top = cy - popH / 2
    let left = cx - popW / 2
    if (step.placement === 'right') {
      left = rect.left + rect.width + pad
      top = Math.max(pad, Math.min(window.innerHeight - popH - pad, cy - popH / 2))
    } else if (step.placement === 'left') {
      left = rect.left - popW - pad
      top = Math.max(pad, Math.min(window.innerHeight - popH - pad, cy - popH / 2))
    } else if (step.placement === 'bottom') {
      top = rect.top + rect.height + pad
      left = Math.max(pad, Math.min(window.innerWidth - popW - pad, cx - popW / 2))
    } else if (step.placement === 'top') {
      top = rect.top - popH - pad
      left = Math.max(pad, Math.min(window.innerWidth - popW - pad, cx - popW / 2))
    }
    return { top, left }
  }, [rect, step])

  if (!tourActive || !step) return null

  const isFirst = stepIndex === 0
  const isLast = stepIndex === TOUR_STEPS.length - 1

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      {/* Backdrop with cut-out via 4 panels */}
      {rect ? (
        <>
          <div className="absolute bg-black/60 pointer-events-auto" style={{ top: 0, left: 0, right: 0, height: Math.max(0, rect.top - 4) }} />
          <div className="absolute bg-black/60 pointer-events-auto" style={{ top: rect.top + rect.height + 4, left: 0, right: 0, bottom: 0 }} />
          <div className="absolute bg-black/60 pointer-events-auto" style={{ top: Math.max(0, rect.top - 4), left: 0, width: Math.max(0, rect.left - 4), height: rect.height + 8 }} />
          <div className="absolute bg-black/60 pointer-events-auto" style={{ top: Math.max(0, rect.top - 4), left: rect.left + rect.width + 4, right: 0, height: rect.height + 8 }} />
          {/* Highlight ring */}
          <div
            className="absolute rounded-xl border-2 border-primary shadow-[0_0_0_4px_rgba(99,102,241,0.25)] pointer-events-none animate-pulse"
            style={{ top: rect.top - 4, left: rect.left - 4, width: rect.width + 8, height: rect.height + 8 }}
          />
        </>
      ) : (
        <div className="absolute inset-0 bg-black/60 pointer-events-auto" />
      )}

      {/* Popover */}
      <div
        className="absolute pointer-events-auto rounded-2xl border bg-card shadow-2xl p-5 w-[360px]"
        style={popoverStyle}
      >
        <button
          onClick={completeTour}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
          title="Skip tour"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2 mb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20">
            <MagicStar size={16} variant="Bulk" color="currentColor" className="text-primary" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Step {stepIndex + 1} of {TOUR_STEPS.length}
          </span>
        </div>

        <h3 className="text-lg font-bold mb-1">{step.title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>

        {/* Progress dots */}
        <div className="flex gap-1 my-4">
          {TOUR_STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i === stepIndex ? 'bg-primary' : i < stepIndex ? 'bg-primary/40' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={completeTour}>
            Skip
          </Button>
          <div className="flex gap-2">
            {!isFirst && (
              <Button variant="outline" size="sm" onClick={() => setStepIndex(i => i - 1)}>
                Back
              </Button>
            )}
            {isLast ? (
              <Button size="sm" onClick={completeTour}>Finish</Button>
            ) : (
              <Button size="sm" onClick={() => setStepIndex(i => i + 1)}>
                Next
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
