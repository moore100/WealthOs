import { useState } from 'react'
import { Eye, EyeOff, ShieldCheck, User, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { AuthUser } from '@/store/appStore'

interface Props {
  onLogin: (user: AuthUser) => void
}

const FEATURES = [
  { icon: '💳', label: 'Track Expenses', desc: 'Smart categorization and insights.' },
  { icon: '', label: 'Grow Investments', desc: 'AI-powered investment insights.' },
  { icon: '🏦', label: 'Build Savings', desc: 'Automate savings and hit goals faster.' },
  { icon: '✨', label: 'AI Powered', desc: 'Personalized insights tailored for you.' },
]

export default function LoginPage({ onLogin }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const reset = () => { setError(''); setUsername(''); setDisplayName(''); setPassword(''); setConfirmPassword('') }
  const switchMode = (m: 'login' | 'register') => { reset(); setMode(m) }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (mode === 'register') {
      if (password !== confirmPassword) { setError('Passwords do not match'); return }
      if (password.length < 4) { setError('Password must be at least 4 characters'); return }
    }
    if (!window.api?.auth) { setError('App not ready — please restart the application'); return }
    setLoading(true)
    try {
      const user = mode === 'login'
        ? await window.api.auth.login({ username, password })
        : await window.api.auth.register({ username, displayName: displayName || username, password })
      onLogin(user)
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid h-screen w-screen overflow-hidden" style={{ gridTemplateColumns: '1fr 1fr' }}>
      {/* drag region */}
      <div className="app-drag fixed inset-x-0 top-0 z-50 h-8" />

      {/* ══ LEFT — form panel (uses theme vars) ═════════════════ */}
      <div className="flex flex-col bg-background overflow-y-auto px-12 py-8">

        {/* logo */}
        <div className="flex items-center gap-2.5 mb-auto">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
            <span className="text-base font-black text-primary-foreground">W</span>
          </div>
          <span className="text-base font-semibold tracking-wide text-foreground">wealth os</span>
        </div>

        {/* form centered */}
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">

          <div className="mb-6">
            <h1 className="mb-1 text-3xl font-bold text-foreground">
              {mode === 'login' ? 'Welcome back' : 'Create account'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {mode === 'login'
                ? 'Sign in to continue your wealth journey.'
                : 'Start your wealth journey today.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">

            {mode === 'register' && (
              <div className="space-y-1.5">
                <Label htmlFor="displayName">Display Name</Label>
                <div className="relative">
                  <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input id="displayName" placeholder="Your full name" value={displayName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDisplayName(e.target.value)}
                    className="pl-9" autoComplete="name" />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="username">
                {mode === 'register' ? 'Username' : 'Username'}
              </Label>
              <div className="relative">
                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input id="username"
                  placeholder={mode === 'register' ? 'Choose a username' : 'Enter your username'}
                  value={username}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
                  required className="pl-9" autoComplete="username" />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
              </div>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input id="password" type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password" value={password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                  required className="pl-9 pr-10"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {mode === 'register' && (
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input id="confirmPassword" type={showPassword ? 'text' : 'password'}
                    placeholder="Repeat your password" value={confirmPassword}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                    required className="pl-9" autoComplete="new-password" />
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {error}
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === 'login' ? (
              <>New to Wealth OS?{' '}
                <button onClick={() => switchMode('register')}
                  className="font-medium text-primary underline-offset-4 hover:underline">
                  Create an account
                </button>
              </>
            ) : (
              <>Already have an account?{' '}
                <button onClick={() => switchMode('login')}
                  className="font-medium text-primary underline-offset-4 hover:underline">
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>

        <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck size={11} />
          <span>Your data stays on your device, always.</span>
        </div>
      </div>

      {/* ══ RIGHT — decorative panel (uses theme vars) ══════════ */}
      <div className="relative flex flex-col overflow-hidden bg-muted">
        {/* subtle gradient overlay */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5" />

        {/* logo */}
        <div className="relative flex items-center gap-2.5 px-12 pt-8">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
            <span className="text-base font-black text-primary-foreground">W</span>
          </div>
          <span className="text-base font-semibold tracking-wide text-foreground">wealth os</span>
        </div>

        {/* hero copy */}
        <div className="relative px-12 pt-10">
          <h2 className="text-[2.4rem] font-bold leading-tight text-foreground">Your Wealth.</h2>
          <h2 className="text-[2.4rem] font-bold leading-tight text-primary">Intelligently</h2>
          <h2 className="text-[2.4rem] font-bold leading-tight text-foreground mb-4">Managed.</h2>
          <p className="text-sm leading-relaxed text-muted-foreground max-w-xs">
            Manage expenses, grow investments, build savings
            and achieve your financial goals with the power of AI.
          </p>
        </div>

        {/* central emblem */}
        <div className="relative flex flex-1 items-center justify-center">
          <div className="absolute h-64 w-64 rounded-full bg-primary/10" />
          <div className="relative flex h-32 w-32 items-center justify-center rounded-[24px] bg-primary/20 border border-primary/30 shadow-xl">
            <span className="text-5xl font-black text-primary select-none">W</span>

            <div className="absolute -top-5 -right-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-card border border-border text-xl shadow-md select-none">🤖</div>
            <div className="absolute -top-5 -left-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-card border border-border text-xl shadow-md select-none">💳</div>
            <div className="absolute -bottom-5 -right-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-card border border-border text-xl shadow-md select-none">📈</div>
            <div className="absolute -bottom-5 -left-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-card border border-border text-xl shadow-md select-none">🏦</div>
          </div>
        </div>

        {/* feature list */}
        <div className="relative space-y-3 px-12 pb-10">
          {FEATURES.map(f => (
            <div key={f.label} className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 border border-primary/20 text-base select-none">
                {f.icon}
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">{f.label}</p>
                <p className="text-xs text-muted-foreground">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
