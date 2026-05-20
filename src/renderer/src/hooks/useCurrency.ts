import { useAppStore } from '../store/appStore'
import { formatCurrency } from '../utils/formatCurrency'

export function useCurrency() {
  const { settings } = useAppStore()
  const currency = settings.currency || 'USD'
  const locale = settings.locale || 'en-US'
  const symbol = settings.currencySymbol || '$'

  return {
    currency,
    locale,
    symbol,
    format: (amount: number) => formatCurrency(amount, currency, locale),
    formatCompact: (amount: number) => {
      if (Math.abs(amount) >= 1_000_000) return `${symbol}${(amount / 1_000_000).toFixed(1)}M`
      if (Math.abs(amount) >= 1_000) return `${symbol}${(amount / 1_000).toFixed(1)}K`
      return formatCurrency(amount, currency, locale)
    },
  }
}
