export function calculateHealthScore(data: {
  income: number
  expenses: number
  totalDebt: number
  monthlyDebtPayments: number
  totalSavings: number
  totalInvestments: number
  emergencyFundMonths: number
}): { score: number; factors: { name: string; score: number; max: number; tip: string }[] } {
  const factors = []

  // 1. Expense Ratio (income coverage) — max 25
  const expenseRatio = data.income > 0 ? data.expenses / data.income : 1
  const expenseScore = Math.max(0, Math.min(25, (1 - expenseRatio) * 50))
  factors.push({
    name: 'Spending Control',
    score: Math.round(expenseScore),
    max: 25,
    tip: expenseRatio > 0.8 ? 'Your expenses are high relative to income. Aim for under 70%.' : 'Good spending control!',
  })

  // 2. Debt-to-Income — max 20
  const dtiRatio = data.income > 0 ? data.monthlyDebtPayments / data.income : 0
  const debtScore = Math.max(0, Math.min(20, (1 - dtiRatio * 3) * 20))
  factors.push({
    name: 'Debt Management',
    score: Math.round(debtScore),
    max: 20,
    tip: dtiRatio > 0.3 ? 'Debt payments exceed 30% of income. Consider debt avalanche strategy.' : 'Healthy debt ratio!',
  })

  // 3. Emergency Fund — max 20
  const emergencyScore = Math.min(20, data.emergencyFundMonths * (20 / 6))
  factors.push({
    name: 'Emergency Fund',
    score: Math.round(emergencyScore),
    max: 20,
    tip: data.emergencyFundMonths < 3 ? 'Build 3-6 months of expenses in an emergency fund.' : `${data.emergencyFundMonths.toFixed(1)} months covered — great!`,
  })

  // 4. Savings Rate — max 20
  const savingsRate = data.income > 0 ? (data.income - data.expenses) / data.income : 0
  const savingsScore = Math.max(0, Math.min(20, savingsRate * 100))
  factors.push({
    name: 'Savings Rate',
    score: Math.round(savingsScore),
    max: 20,
    tip: savingsRate < 0.1 ? 'Aim to save at least 20% of income.' : `Saving ${(savingsRate * 100).toFixed(0)}% — excellent!`,
  })

  // 5. Investment Activity — max 15
  const investmentScore = data.totalInvestments > 0 ? Math.min(15, (data.totalInvestments / (data.income * 12)) * 15) : 0
  factors.push({
    name: 'Investment Portfolio',
    score: Math.round(investmentScore),
    max: 15,
    tip: data.totalInvestments === 0 ? 'Start investing — even small amounts compound over time.' : 'Keep building your portfolio!',
  })

  const total = factors.reduce((sum, f) => sum + f.score, 0)
  return { score: total, factors }
}

export function calculateAmortization(
  principal: number,
  annualRate: number,
  monthlyPayment: number,
  months = 360
): { month: number; principal: number; interest: number; balance: number }[] {
  const monthlyRate = annualRate / 100 / 12
  const schedule = []
  let balance = principal

  for (let m = 1; m <= months && balance > 0; m++) {
    const interest = balance * monthlyRate
    const principalPaid = Math.min(monthlyPayment - interest, balance)
    balance -= principalPaid
    schedule.push({ month: m, principal: principalPaid, interest, balance: Math.max(0, balance) })
    if (balance <= 0) break
  }
  return schedule
}

export function payoffWithExtra(
  balance: number,
  annualRate: number,
  minPayment: number,
  extraPayment: number
): { monthsSaved: number; interestSaved: number; newPayoffMonths: number } {
  const monthlyRate = annualRate / 100 / 12
  const calcMonths = (pmt: number) => {
    let bal = balance
    let m = 0
    let totalInterest = 0
    while (bal > 0 && m < 600) {
      const interest = bal * monthlyRate
      totalInterest += interest
      bal -= Math.min(pmt - interest, bal)
      m++
    }
    return { months: m, totalInterest }
  }
  const base = calcMonths(minPayment)
  const extra = calcMonths(minPayment + extraPayment)
  return {
    monthsSaved: base.months - extra.months,
    interestSaved: base.totalInterest - extra.totalInterest,
    newPayoffMonths: extra.months,
  }
}

export function compoundGrowth(
  monthly: number,
  annualReturn: number,
  years: number
): { year: number; value: number }[] {
  const monthlyRate = annualReturn / 100 / 12
  const result = []
  let value = 0
  for (let y = 1; y <= years; y++) {
    for (let m = 0; m < 12; m++) {
      value = value * (1 + monthlyRate) + monthly
    }
    result.push({ year: y, value: Math.round(value) })
  }
  return result
}

export function getMonthlyIncome(amount: number, frequency: string): number {
  switch (frequency) {
    case 'daily': return amount * 30
    case 'weekly': return amount * 4.33
    case 'biweekly': return amount * 2.17
    case 'monthly': return amount
    case 'quarterly': return amount / 3
    case 'yearly': return amount / 12
    default: return amount
  }
}
