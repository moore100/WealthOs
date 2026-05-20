import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAppStore } from '@/store/appStore'
import { useThemeStore, THEME_PRESETS } from '@/store/themeStore'
import { CURRENCIES, COUNTRIES } from '@/utils/formatCurrency'
import { ChevronRight, ChevronLeft, Check, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

const TOTAL_STEPS = 8

const presetColors: Record<string, string> = {
  wealth: 'bg-green-500',
  midnight: 'bg-cyan-500',
  'rose-gold': 'bg-pink-400',
  obsidian: 'bg-purple-500',
  arctic: 'bg-blue-400',
  sunset: 'bg-orange-500',
  forest: 'bg-emerald-600',
  corporate: 'bg-blue-600',
}

export default function OnboardingWizard() {
  const navigate = useNavigate()
  const { setSettings, setIsOnboarded } = useAppStore()
  const { theme, setPreset, setTheme } = useThemeStore()

  const [step, setStep] = useState(1)
  const [data, setData] = useState({
    name: '',
    country: 'US',
    currency: 'USD',
    monthlyIncome: '',
    primaryGoals: [] as string[],
    selectedPreset: 'wealth',
    mode: 'dark' as 'dark' | 'light',
  })

  const update = (key: string, value: string) => setData(d => ({ ...d, [key]: value }))

  const toggleGoal = (value: string) => setData(d => ({
    ...d,
    primaryGoals: d.primaryGoals.includes(value)
      ? d.primaryGoals.filter(g => g !== value)
      : [...d.primaryGoals, value]
  }))

  const next = () => {
    if (step === 3) setPreset(data.selectedPreset)
    if (step === 3) setTheme({ mode: data.mode })
    if (step < TOTAL_STEPS) setStep(s => s + 1)
  }

  const back = () => { if (step > 1) setStep(s => s - 1) }

  const finish = async () => {
    const curr = CURRENCIES.find(c => c.code === data.currency)
    await setSettings({
      name: data.name,
      country: data.country,
      currency: data.currency,
      currencySymbol: curr?.symbol || '$',
      locale: curr?.locale || 'en-US',
      primaryGoals: data.primaryGoals.join(','),
      onboardingComplete: true,
    })
    setIsOnboarded(true)
    navigate('/dashboard')
  }

  const goals = [
    { value: 'save', label: 'Save More Money', emoji: '💰' },
    { value: 'debt', label: 'Pay Off Debt', emoji: '📉' },
    { value: 'invest', label: 'Grow Investments', emoji: '📈' },
    { value: 'budget', label: 'Stick to Budget', emoji: '📊' },
    { value: 'track', label: 'Track Everything', emoji: '🔍' },
    { value: 'retire', label: 'Plan Retirement', emoji: '🌅' },
  ]

  return (
    <div className="flex min-h-screen w-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/20">
            <span className="text-2xl font-bold text-primary">W</span>
          </div>
          <h1 className="text-2xl font-bold">Welcome to WealthOS</h1>
          <p className="mt-1 text-sm text-muted-foreground">Let's get you set up in a few steps</p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>Step {step} of {TOTAL_STEPS}</span>
            <span>{Math.round((step / TOTAL_STEPS) * 100)}%</span>
          </div>
          <Progress value={(step / TOTAL_STEPS) * 100} className="h-1.5" />
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.2 }}
          >
            <Card>
              <CardContent className="pt-6">
                {step === 1 && (
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-lg font-semibold">What's your name?</h2>
                      <p className="text-sm text-muted-foreground">Personalize your experience</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Full Name</Label>
                      <Input
                        placeholder="e.g. Alex Johnson"
                        value={data.name}
                        onChange={e => update('name', e.target.value)}
                        autoFocus
                      />
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-lg font-semibold">Where are you based?</h2>
                      <p className="text-sm text-muted-foreground">For currency formatting</p>
                    </div>
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label>Country</Label>
                        <Select value={data.country} onValueChange={v => update('country', v)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {COUNTRIES.slice(0, 50).map(c => (
                              <SelectItem key={c.code} value={c.code}>{c.flag} {c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Currency</Label>
                        <Select value={data.currency} onValueChange={v => update('currency', v)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CURRENCIES.map(c => (
                              <SelectItem key={c.code} value={c.code}>{c.symbol} {c.code} — {c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-lg font-semibold">Choose your theme</h2>
                      <p className="text-sm text-muted-foreground">You can customize this later in Theme Studio</p>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {Object.entries(THEME_PRESETS).map(([key]) => (
                        <button
                          key={key}
                          onClick={() => update('selectedPreset', key)}
                          className={cn(
                            'flex flex-col items-center gap-2 rounded-lg border p-3 transition-all',
                            data.selectedPreset === key
                              ? 'border-primary bg-primary/10'
                              : 'border-border hover:border-primary/50'
                          )}
                        >
                          <div className={cn('h-6 w-6 rounded-full', presetColors[key] || 'bg-primary')} />
                          <span className="text-[10px] capitalize">{key.replace('-', ' ')}</span>
                          {data.selectedPreset === key && <Check className="h-3 w-3 text-primary" />}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      {(['dark', 'light'] as const).map(m => (
                        <button
                          key={m}
                          onClick={() => update('mode', m)}
                          className={cn(
                            'flex-1 rounded-lg border px-3 py-2 text-sm capitalize transition-all',
                            data.mode === m ? 'border-primary bg-primary/10 text-primary' : 'border-border'
                          )}
                        >
                          {m === 'dark' ? '🌙' : '☀️'} {m}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {step === 4 && (
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-lg font-semibold">Monthly income</h2>
                      <p className="text-sm text-muted-foreground">Used for budgeting suggestions (optional)</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Approximate Monthly Income</Label>
                      <Input
                        type="number"
                        placeholder="e.g. 5000"
                        value={data.monthlyIncome}
                        onChange={e => update('monthlyIncome', e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {step === 5 && (
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-lg font-semibold">Financial goals</h2>
                      <p className="text-sm text-muted-foreground">Pick all that apply — you can have more than one</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {goals.map(g => {
                        const selected = data.primaryGoals.includes(g.value)
                        return (
                          <button
                            key={g.value}
                            onClick={() => toggleGoal(g.value)}
                            className={cn(
                              'flex items-center gap-2 rounded-lg border p-3 text-sm text-left transition-all',
                              selected ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
                            )}
                          >
                            <span className="text-lg">{g.emoji}</span>
                            <span className="font-medium flex-1">{g.label}</span>
                            {selected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                          </button>
                        )
                      })}
                    </div>
                    {data.primaryGoals.length > 0 && (
                      <p className="text-xs text-center text-muted-foreground">
                        {data.primaryGoals.length} goal{data.primaryGoals.length !== 1 ? 's' : ''} selected
                      </p>
                    )}
                  </div>
                )}

                {step === 6 && (
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-lg font-semibold">AI Financial Advisor</h2>
                      <p className="text-sm text-muted-foreground">
                        WealthOS has a built-in AI advisor. Choose between OpenAI (cloud) or Ollama (local & private) in Settings → AI Provider.
                      </p>
                    </div>
                    <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                      <div className="flex items-start gap-3">
                        <Sparkles className="mt-0.5 h-5 w-5 text-primary shrink-0" />
                        <div>
                          <p className="text-sm font-medium">What AI can do for you:</p>
                          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                            <li>• Analyze your spending patterns</li>
                            <li>• Suggest savings opportunities</li>
                            <li>• Answer financial questions</li>
                            <li>• Generate personalized insights</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {step === 7 && (
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-lg font-semibold">Key features</h2>
                      <p className="text-sm text-muted-foreground">Here's what you can track with WealthOS</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { emoji: '💳', label: 'Income & Expenses' },
                        { emoji: '📈', label: 'Investments' },
                        { emoji: '🎯', label: 'Savings Goals' },
                        { emoji: '💰', label: 'Loans & Debt' },
                        { emoji: '🔄', label: 'Subscriptions' },
                        { emoji: '👥', label: 'People & IOUs' },
                        { emoji: '📊', label: 'Budget Planner' },
                        { emoji: '🏦', label: 'Net Worth' },
                      ].map(f => (
                        <div key={f.label} className="flex items-center gap-2 rounded-lg border border-border p-2.5 text-sm">
                          <span>{f.emoji}</span>
                          <span>{f.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {step === 8 && (
                  <div className="space-y-4 text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/20">
                      <span className="text-3xl">🎉</span>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">You're all set{data.name ? `, ${data.name}` : ''}!</h2>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Your WealthOS is ready. Start by adding your income sources and first expense.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {['Dashboard', 'AI Chat', 'Theme Studio', 'Budget'].map(f => (
                        <Badge key={f} variant="secondary">{f}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="mt-6 flex items-center justify-between">
          <Button variant="ghost" onClick={back} disabled={step === 1}>
            <ChevronLeft className="mr-1 h-4 w-4" /> Back
          </Button>
          <div className="flex items-center gap-2">
            {import.meta.env.DEV && (
              <Button variant="outline" size="sm" onClick={finish} className="text-xs text-muted-foreground">
                Skip (Dev)
              </Button>
            )}
            {step < TOTAL_STEPS ? (
              <Button onClick={next}>
                Next <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={finish} className="gap-2">
                <Sparkles className="h-4 w-4" />
                Launch WealthOS
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
