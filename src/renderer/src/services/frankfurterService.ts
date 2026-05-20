export interface FrankfurterRate {
  date: string
  rate: number
}

export async function fetchFrankfurterLatest(from: string, to: string): Promise<{
  amount: number
  base: string
  date: string
  rates: Record<string, number>
}> {
  const res = await fetch(`https://api.frankfurter.app/latest?from=${from}&to=${to}`)
  if (!res.ok) throw new Error(`Frankfurter error: ${res.status}`)
  return res.json()
}

export async function fetchFrankfurterHistory(
  from: string,
  to: string,
  days: number = 90
): Promise<FrankfurterRate[]> {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - days)
  const endStr = end.toISOString().slice(0, 10)
  const startStr = start.toISOString().slice(0, 10)

  const res = await fetch(
    `https://api.frankfurter.app/${startStr}..${endStr}?from=${from}&to=${to}`
  )
  if (!res.ok) throw new Error(`Frankfurter history error: ${res.status}`)
  const data = await res.json()
  const rates = data.rates as Record<string, Record<string, number>>
  return Object.entries(rates)
    .map(([date, rateObj]) => ({
      date,
      rate: rateObj[to] || 0,
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
}

export const COMMON_FOREX_PAIRS = [
  { from: 'EUR', to: 'USD', label: 'EUR / USD' },
  { from: 'GBP', to: 'USD', label: 'GBP / USD' },
  { from: 'USD', to: 'JPY', label: 'USD / JPY' },
  { from: 'EUR', to: 'GBP', label: 'EUR / GBP' },
  { from: 'AUD', to: 'USD', label: 'AUD / USD' },
  { from: 'USD', to: 'CHF', label: 'USD / CHF' },
  { from: 'USD', to: 'CAD', label: 'USD / CAD' },
  { from: 'NZD', to: 'USD', label: 'NZD / USD' },
  { from: 'EUR', to: 'JPY', label: 'EUR / JPY' },
  { from: 'GBP', to: 'JPY', label: 'GBP / JPY' },
]
