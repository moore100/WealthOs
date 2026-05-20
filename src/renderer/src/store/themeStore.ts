import { create } from 'zustand'
import type { ThemeSettings } from '../types'

const DEFAULT_THEME: ThemeSettings = {
  preset: 'wealth',
  mode: 'dark',
  primary: '142 71% 45%',
  secondary: '217 33% 17%',
  accent: '43 74% 47%',
  background: '222 47% 7%',
  card: '222 47% 10%',
  muted: '217 33% 14%',
  border: '217 33% 20%',
  radius: '0.75rem',
  font: 'Inter',
  fontSize: '16px',
  sidebarStyle: 'floating',
  chartPalette: 'vivid',
  cardStyle: 'glass',
  density: 'comfortable',
  motion: true,
  // Advanced
  sidebarColor: 'transparent',
  sidebarTextColor: '',
  topbarColor: '',
  topbarTextColor: '',
  cardHoverAnimation: 'lift',
  cardBorderStyle: 'default',
  lightDirection: 'top',
  glassMorphism: false,
  glassBlur: 'md',
  glassOpacity: '0.1',
  backgroundImage: '',
  backgroundOverlay: '0.7',
  backgroundSize: 'cover',
  appBlur: 'none',
  animationSpeed: 'normal',
  hoverIntensity: 'medium',
  shadowIntensity: 'medium',
  borderWidth: 'normal',
  iconStyle: 'outline',
  scrollbarStyle: 'rounded',
  gradientOverlay: false,
  ambientGlow: false,
  sidebarGlow: false,
}

interface ThemeStore {
  theme: ThemeSettings
  loaded: boolean
  setTheme: (theme: Partial<ThemeSettings>) => void
  setPreset: (preset: string) => void
  resetToDefault: () => void
  loadFromStore: () => Promise<void>
  applyToDOM: (theme: ThemeSettings) => void
}

export const THEME_PRESETS: Record<string, ThemeSettings> = {
  wealth: {
    preset: 'wealth',
    primary: '142 71% 45%',
    secondary: '217 33% 17%',
    accent: '43 74% 47%',
    background: '222 47% 7%',
    card: '222 47% 10%',
    muted: '217 33% 14%',
    border: '217 33% 20%',
  },
  midnight: {
    preset: 'midnight',
    primary: '199 89% 48%',
    secondary: '222 47% 15%',
    accent: '180 100% 50%',
    background: '224 71% 4%',
    card: '222 47% 8%',
    muted: '217 33% 12%',
    border: '217 33% 17%',
  },
  'rose-gold': {
    preset: 'rose-gold',
    primary: '350 85% 65%',
    secondary: '320 30% 18%',
    accent: '40 90% 60%',
    background: '320 30% 6%',
    card: '320 25% 10%',
    muted: '320 20% 14%',
    border: '320 20% 20%',
  },
  obsidian: {
    preset: 'obsidian',
    primary: '270 75% 65%',
    secondary: '240 10% 12%',
    accent: '280 90% 70%',
    background: '240 10% 4%',
    card: '240 10% 8%',
    muted: '240 8% 12%',
    border: '240 8% 18%',
  },
  arctic: {
    preset: 'arctic',
    primary: '200 90% 55%',
    secondary: '200 40% 90%',
    accent: '210 50% 60%',
    background: '210 40% 97%',
    card: '0 0% 100%',
    muted: '210 30% 94%',
    border: '210 20% 88%',
    mode: 'light' as const,
  },
  sunset: {
    preset: 'sunset',
    primary: '24 100% 55%',
    secondary: '350 60% 18%',
    accent: '5 85% 55%',
    background: '10 30% 6%',
    card: '10 25% 10%',
    muted: '350 20% 14%',
    border: '350 20% 20%',
  },
  forest: {
    preset: 'forest',
    primary: '125 60% 45%',
    secondary: '130 30% 12%',
    accent: '90 70% 50%',
    background: '130 25% 5%',
    card: '130 20% 9%',
    muted: '130 15% 13%',
    border: '130 15% 18%',
  },
  corporate: {
    preset: 'corporate',
    primary: '215 90% 55%',
    secondary: '215 30% 15%',
    accent: '215 20% 50%',
    background: '215 30% 6%',
    card: '215 25% 10%',
    muted: '215 20% 14%',
    border: '215 20% 20%',
  },
}

function injectDynamicStyles(css: string): void {
  let style = document.getElementById('theme-dynamic-styles') as HTMLStyleElement | null
  if (!style) {
    style = document.createElement('style')
    style.id = 'theme-dynamic-styles'
    document.head.appendChild(style)
  }
  style.textContent = css
}

function applyThemeToDOM(theme: ThemeSettings): void {
  const root = document.documentElement

  // ─── Mode ────────────────────────────────────────────────────────────
  if (theme.mode === 'dark') {
    root.classList.add('dark')
    root.classList.remove('light')
  } else if (theme.mode === 'light') {
    root.classList.remove('dark')
    root.classList.add('light')
  } else {
    root.classList.remove('dark', 'light')
  }

  // ─── Core Color Variables ────────────────────────────────────────────
  const allVars: Record<string, string | undefined> = {
    '--primary': theme.primary,
    '--secondary': theme.secondary,
    '--accent': theme.accent,
    '--background': theme.background,
    '--card': theme.card,
    '--muted': theme.muted,
    '--border': theme.border,
    '--input': theme.border,
    '--ring': theme.primary,
    '--radius': theme.radius,
    '--font-family': theme.font ? `'${theme.font}', sans-serif` : undefined,
    '--base-font-size': theme.fontSize,
    '--sidebar-bg': theme.sidebarColor,
    '--sidebar-text': theme.sidebarTextColor,
    '--topbar-bg': theme.topbarColor,
    '--topbar-text': theme.topbarTextColor,
    '--glass-blur': theme.glassBlur ? { sm: '4px', md: '8px', lg: '12px', xl: '16px', '2xl': '24px' }[theme.glassBlur] : undefined,
    '--glass-opacity': theme.glassOpacity,
    '--bg-overlay': theme.backgroundOverlay,
    '--anim-speed': theme.animationSpeed === 'slow' ? '0.5s' : theme.animationSpeed === 'fast' ? '0.15s' : '0.3s',
    '--shadow-intensity': theme.shadowIntensity,
    '--border-width': theme.borderWidth === 'thin' ? '1px' : theme.borderWidth === 'thick' ? '2px' : '1px',
    '--hover-intensity': theme.hoverIntensity,
    '--spacing-unit': { compact: '0.75rem', comfortable: '1rem', spacious: '1.25rem' }[theme.density || 'comfortable'],
  }
  Object.entries(allVars).forEach(([k, v]) => {
    if (v !== undefined && v !== '') root.style.setProperty(k, v)
    else root.style.removeProperty(k)
  })

  // ─── Background Image ──────────────────────────────────────────────────
  if (theme.backgroundImage) {
    root.style.setProperty('--bg-image', `url("${theme.backgroundImage}")`)
    root.style.setProperty('--bg-size', theme.backgroundSize || 'cover')
  } else {
    root.style.removeProperty('--bg-image')
    root.style.removeProperty('--bg-size')
  }

  // ─── Attributes ──────────────────────────────────────────────────────
  const attrs = ['chartPalette', 'cardStyle', 'sidebarStyle', 'density', 'motion', 'cardHoverAnimation', 'cardBorderStyle', 'lightDirection', 'appBlur', 'iconStyle', 'scrollbarStyle', 'glassMorphism', 'gradientOverlay', 'ambientGlow', 'sidebarGlow']
  attrs.forEach(a => {
    const val = (theme as any)[a]
    if (val !== undefined && val !== '') root.setAttribute(`data-${a.replace(/[A-Z]/g, m => '-' + m.toLowerCase())}`, String(val))
    else root.removeAttribute(`data-${a.replace(/[A-Z]/g, m => '-' + m.toLowerCase())}`)
  })

  // ─── Dynamic CSS Injection ─────────────────────────────────────────────
  const shadowMap: Record<string, string> = {
    none: 'none',
    soft: '0 1px 3px rgba(0,0,0,0.1)',
    medium: '0 4px 12px rgba(0,0,0,0.15)',
    strong: '0 8px 30px rgba(0,0,0,0.25)',
    neon: '0 0 20px hsl(var(--primary) / 0.3), 0 4px 12px rgba(0,0,0,0.2)',
  }

  const animSpeed = theme.animationSpeed === 'slow' ? '0.5s' : theme.animationSpeed === 'fast' ? '0.15s' : '0.3s'
  const isGlass = theme.glassMorphism
  const glassCSS = isGlass
    ? `backdrop-filter: blur(var(--glass-blur, 8px)) !important; -webkit-backdrop-filter: blur(var(--glass-blur, 8px)) !important; background: hsl(var(--card) / var(--glass-opacity, 0.1)) !important;`
    : ''

  const hMult = theme.hoverIntensity === 'subtle' ? 0.5 : theme.hoverIntensity === 'strong' ? 1.5 : 1
  const shadowVal = shadowMap[theme.shadowIntensity || 'medium'] || shadowMap.medium

  const cardHoverCSS = {
    none: '',
    lift: `transform: translateY(${-4 * hMult}px); box-shadow: ${shadowVal};`,
    glow: `box-shadow: 0 0 ${30 * hMult}px hsl(var(--primary) / ${0.25 * hMult}), ${shadowVal};`,
    scale: `transform: scale(${1 + 0.02 * hMult});`,
    shine: `background: linear-gradient(105deg, hsl(var(--card)) 40%, hsl(var(--primary) / ${0.05 * hMult}) 50%, hsl(var(--card)) 60%); background-size: 200% 100%;`,
    'border-glow': `border-color: hsl(var(--primary) / ${0.6 * hMult}) !important; box-shadow: 0 0 0 1px hsl(var(--primary) / ${0.3 * hMult});`,
  }[theme.cardHoverAnimation || 'none']

  const cardBorderCSS = {
    default: '',
    glow: `border-color: hsl(var(--primary) / 0.3) !important; box-shadow: 0 0 10px hsl(var(--primary) / 0.1);`,
    gradient: `border-image: linear-gradient(to ${theme.lightDirection === 'radial' ? 'right' : theme.lightDirection || 'bottom'}, hsl(var(--primary)), hsl(var(--accent))) 1;`,
    neon: `border-color: hsl(var(--primary)) !important; box-shadow: 0 0 5px hsl(var(--primary) / 0.5), inset 0 0 5px hsl(var(--primary) / 0.1);`,
  }[theme.cardBorderStyle || 'default']

  const scrollbarCSS = theme.scrollbarStyle === 'hidden'
    ? 'scrollbar-width: none;'
    : theme.scrollbarStyle === 'thin'
    ? 'scrollbar-width: thin;'
    : ''

  const appBlurVal = theme.appBlur === 'sm' ? '2px' : theme.appBlur === 'md' ? '4px' : theme.appBlur === 'lg' ? '8px' : '0'
  const appBlurCSS = theme.appBlur && theme.appBlur !== 'none'
    ? `#app-root { filter: blur(${appBlurVal}); transition: filter var(--anim-speed, 0.3s); }`
    : '#app-root { filter: none; }'

  const bgImageCSS = theme.backgroundImage
    ? `background-image: var(--bg-image) !important; background-size: var(--bg-size, cover) !important; background-position: center !important; background-attachment: fixed !important;`
    : ''

  const overlayCSS = theme.gradientOverlay && theme.backgroundImage
    ? `background-image: linear-gradient(to ${theme.lightDirection === 'radial' ? 'bottom' : theme.lightDirection || 'bottom'}, transparent 0%, hsl(var(--background) / var(--bg-overlay, 0.7)) 100%), var(--bg-image, none) !important; background-size: cover !important; background-position: center !important;`
    : ''

  const ambientGlowCSS = theme.ambientGlow
    ? `box-shadow: inset 0 0 150px hsl(var(--primary) / 0.08);`
    : ''

  const sidebarGlowCSS = theme.sidebarGlow
    ? `box-shadow: inset -3px 0 30px hsl(var(--primary) / 0.12) !important;`
    : ''

  const cardStyleCSS = {
    default: '',
    elevated: `.bg-card { box-shadow: 0 8px 30px rgba(0,0,0,0.2) !important; }`,
    glass: `.bg-card { ${glassCSS} border-color: hsl(var(--border) / 0.3) !important; }`,
    flat: `.bg-card { background: hsl(var(--muted)) !important; border: none !important; box-shadow: none !important; }`,
  }[theme.cardStyle || 'default']

  const iconCSS = theme.iconStyle === 'filled'
    ? `svg * { stroke-width: 0; fill: currentColor; }`
    : theme.iconStyle === 'duotone'
    ? `svg { opacity: 0.85; }`
    : ''

  const dynamicCSS = `
    /* App root background + overlay */
    #app-root { ${bgImageCSS} }
    ${theme.gradientOverlay && theme.backgroundImage ? `#app-root::after { content: ''; position: absolute; inset: 0; pointer-events: none; z-index: 0; background: linear-gradient(to ${theme.lightDirection === 'radial' ? 'bottom' : theme.lightDirection || 'bottom'}, transparent 0%, hsl(var(--background) / var(--bg-overlay, 0.7)) 100%); }` : ''}
    ${appBlurCSS}
    ${cardStyleCSS}

    /* Sidebar */
    aside[data-sidebar] { background: var(--sidebar-bg, transparent) !important; }
    aside[data-sidebar] .text-muted-foreground,
    aside[data-sidebar] .text-foreground { color: var(--sidebar-text, inherit) !important; }

    /* Topbar */
    header.app-drag { background: var(--topbar-bg, hsl(var(--card))) !important; }
    header.app-drag .text-foreground,
    header.app-drag .text-muted-foreground { color: var(--topbar-text, inherit) !important; }

    /* Card base + hover */
    .bg-card {
      transition: all ${animSpeed} ease !important;
      border-width: var(--border-width, 1px) !important;
      ${cardBorderCSS}
    }
    .bg-card:hover { ${cardHoverCSS} }

    /* Glass morphism override */
    ${isGlass ? `[data-glass-morphism="true"] .bg-card { ${glassCSS} }` : ''}

    /* Scrollbar */
    * { ${scrollbarCSS} }
    ${theme.scrollbarStyle === 'rounded' ? '::-webkit-scrollbar { width: 8px; height: 8px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: hsl(var(--muted)); border-radius: 4px; } ::-webkit-scrollbar-thumb:hover { background: hsl(var(--border)); }' : ''}
    ${theme.scrollbarStyle === 'thin' ? '::-webkit-scrollbar { width: 4px; height: 4px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: hsl(var(--muted)); border-radius: 2px; }' : ''}
    ${theme.scrollbarStyle === 'hidden' ? '::-webkit-scrollbar { display: none; }' : ''}

    /* Ambient glow on main content area */
    ${theme.ambientGlow ? `[data-ambient-glow="true"] #app-root > div:last-child { ${ambientGlowCSS} }` : ''}

    /* Sidebar glow */
    ${theme.sidebarGlow ? `aside[data-sidebar] { ${sidebarGlowCSS} }` : ''}

    /* Font family */
    ${theme.font ? `body, button, input, textarea, select { font-family: var(--font-family, 'Inter'), sans-serif !important; }` : ''}

    /* Base font size */
    ${theme.fontSize ? `html { font-size: var(--base-font-size, 16px); }` : ''}

    /* Motion disable */
    ${theme.motion === false ? '*, *::before, *::after { animation: none !important; transition: none !important; }' : ''}

    /* Icon style */
    ${iconCSS}
  `

  injectDynamicStyles(dynamicCSS)
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  theme: DEFAULT_THEME,
  loaded: false,

  applyToDOM: applyThemeToDOM,

  setTheme: (partial) => {
    const newTheme = { ...get().theme, ...partial }
    set({ theme: newTheme })
    applyThemeToDOM(newTheme)
    // Persist
    window.api?.theme?.set(newTheme).catch(() => {})
  },

  setPreset: (presetKey) => {
    const preset = THEME_PRESETS[presetKey]
    if (!preset) return
    const current = get().theme
    const newTheme: ThemeSettings = {
      ...current,
      ...preset,
      preset: presetKey,
      mode: preset.mode || current.mode,
      radius: current.radius,
      font: current.font,
      fontSize: current.fontSize,
      sidebarStyle: current.sidebarStyle,
      chartPalette: current.chartPalette,
      cardStyle: current.cardStyle,
      density: current.density,
      motion: current.motion,
    }
    set({ theme: newTheme })
    applyThemeToDOM(newTheme)
    window.api?.theme?.set(newTheme as any).catch(() => {})
  },

  resetToDefault: () => {
    set({ theme: DEFAULT_THEME })
    applyThemeToDOM(DEFAULT_THEME)
    window.api?.theme?.set(DEFAULT_THEME as any).catch(() => {})
  },

  loadFromStore: async () => {
    try {
      const stored = await window.api?.theme?.get()
      if (stored && Object.keys(stored).length > 0) {
        const merged = { ...DEFAULT_THEME, ...stored }
        set({ theme: merged, loaded: true })
        applyThemeToDOM(merged)
      } else {
        set({ loaded: true })
        applyThemeToDOM(DEFAULT_THEME)
      }
    } catch {
      set({ loaded: true })
      applyThemeToDOM(DEFAULT_THEME)
    }
  },
}))
