export function formatCurrency(amount: number, currency = 'USD', locale = 'en-US'): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${currency} ${amount.toLocaleString()}`
  }
}

export function formatNumber(amount: number): string {
  if (Math.abs(amount) >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`
  if (Math.abs(amount) >= 1_000) return `${(amount / 1_000).toFixed(1)}K`
  return amount.toFixed(0)
}

export function formatPercent(value: number, total: number): string {
  if (total === 0) return '0%'
  return `${((value / total) * 100).toFixed(1)}%`
}

export function formatDelta(value: number, currency = 'USD', locale = 'en-US'): string {
  const prefix = value >= 0 ? '+' : ''
  return `${prefix}${formatCurrency(value, currency, locale)}`
}

export const CURRENCIES: { code: string; symbol: string; name: string; locale: string }[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar', locale: 'en-US' },
  { code: 'EUR', symbol: '€', name: 'Euro', locale: 'de-DE' },
  { code: 'GBP', symbol: '£', name: 'British Pound', locale: 'en-GB' },
  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling', locale: 'en-KE' },
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira', locale: 'en-NG' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand', locale: 'en-ZA' },
  { code: 'GHS', symbol: 'GH₵', name: 'Ghanaian Cedi', locale: 'en-GH' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', locale: 'en-IN' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', locale: 'en-CA' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', locale: 'en-AU' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', locale: 'ja-JP' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', locale: 'zh-CN' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', locale: 'pt-BR' },
  { code: 'MXN', symbol: '$', name: 'Mexican Peso', locale: 'es-MX' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', locale: 'ar-AE' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', locale: 'en-SG' },
  { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc', locale: 'de-CH' },
  { code: 'SEK', symbol: 'kr', name: 'Swedish Krona', locale: 'sv-SE' },
  { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone', locale: 'nb-NO' },
  { code: 'TZS', symbol: 'TSh', name: 'Tanzanian Shilling', locale: 'sw-TZ' },
  { code: 'UGX', symbol: 'USh', name: 'Ugandan Shilling', locale: 'en-UG' },
  { code: 'ETB', symbol: 'Br', name: 'Ethiopian Birr', locale: 'am-ET' },
]

export const COUNTRIES: { code: string; name: string; currency: string; locale: string; flag: string }[] = [
  { code: 'US', name: 'United States', currency: 'USD', locale: 'en-US', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP', locale: 'en-GB', flag: '🇬🇧' },
  { code: 'KE', name: 'Kenya', currency: 'KES', locale: 'en-KE', flag: '🇰🇪' },
  { code: 'NG', name: 'Nigeria', currency: 'NGN', locale: 'en-NG', flag: '🇳🇬' },
  { code: 'ZA', name: 'South Africa', currency: 'ZAR', locale: 'en-ZA', flag: '🇿🇦' },
  { code: 'GH', name: 'Ghana', currency: 'GHS', locale: 'en-GH', flag: '🇬🇭' },
  { code: 'IN', name: 'India', currency: 'INR', locale: 'en-IN', flag: '🇮🇳' },
  { code: 'CA', name: 'Canada', currency: 'CAD', locale: 'en-CA', flag: '🇨🇦' },
  { code: 'AU', name: 'Australia', currency: 'AUD', locale: 'en-AU', flag: '🇦🇺' },
  { code: 'DE', name: 'Germany', currency: 'EUR', locale: 'de-DE', flag: '🇩🇪' },
  { code: 'FR', name: 'France', currency: 'EUR', locale: 'fr-FR', flag: '🇫🇷' },
  { code: 'BR', name: 'Brazil', currency: 'BRL', locale: 'pt-BR', flag: '🇧🇷' },
  { code: 'MX', name: 'Mexico', currency: 'MXN', locale: 'es-MX', flag: '🇲🇽' },
  { code: 'AE', name: 'UAE', currency: 'AED', locale: 'ar-AE', flag: '🇦🇪' },
  { code: 'SG', name: 'Singapore', currency: 'SGD', locale: 'en-SG', flag: '🇸🇬' },
  { code: 'JP', name: 'Japan', currency: 'JPY', locale: 'ja-JP', flag: '🇯🇵' },
  { code: 'CN', name: 'China', currency: 'CNY', locale: 'zh-CN', flag: '🇨🇳' },
  { code: 'CH', name: 'Switzerland', currency: 'CHF', locale: 'de-CH', flag: '🇨🇭' },
  { code: 'SE', name: 'Sweden', currency: 'SEK', locale: 'sv-SE', flag: '🇸🇪' },
  { code: 'NO', name: 'Norway', currency: 'NOK', locale: 'nb-NO', flag: '🇳🇴' },
  { code: 'TZ', name: 'Tanzania', currency: 'TZS', locale: 'sw-TZ', flag: '🇹🇿' },
  { code: 'UG', name: 'Uganda', currency: 'UGX', locale: 'en-UG', flag: '🇺🇬' },
  { code: 'ET', name: 'Ethiopia', currency: 'ETB', locale: 'am-ET', flag: '🇪🇹' },
]
