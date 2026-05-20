import { z } from 'zod'

// Safe-string fields: trim + length cap to prevent DB bloat / DoS via large blobs
const safeString = (max = 500) => z.string().trim().max(max)
const safeShortString = safeString(200)
const safeLongString = safeString(5000)

// Numeric fields: positive, finite, capped to prevent overflow surprises in SQLite
const safeAmount = z.coerce.number().finite().min(0).max(1_000_000_000)
const safeInt = z.coerce.number().int().min(0)

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Invalid date').optional()

// All supported agent actions as a discriminated union
export const AgentActionSchema = z.union([
  z.object({ type: z.literal('add_expense'), name: safeShortString, amount: safeAmount, category: safeShortString.optional(), date: dateStr, expense_type: safeShortString.optional(), merchant: safeShortString.optional(), payment_method: safeShortString.optional(), notes: safeLongString.optional() }),
  z.object({ type: z.literal('delete_expense'), id: safeInt }),
  z.object({ type: z.literal('add_income'), name: safeShortString, amount: safeAmount, income_type: safeShortString.optional(), frequency: safeShortString.optional(), currency: safeShortString.optional() }),
  z.object({ type: z.literal('add_subscription'), name: safeShortString, amount: safeAmount, frequency: safeShortString.optional(), next_billing_date: dateStr, category: safeShortString.optional() }),
  z.object({ type: z.literal('cancel_subscription'), id: safeInt.optional(), name: safeShortString.optional() }).refine(d => d.id != null || d.name, { message: 'id or name required' }),
  z.object({ type: z.literal('update_category_budget'), category: safeShortString, monthly_budget: safeAmount }),
  z.object({ type: z.literal('transfer_to_goal'), amount: safeAmount, goal_id: safeInt.optional(), goal_name: safeShortString.optional() }).refine(d => d.goal_id != null || d.goal_name, { message: 'goal_id or goal_name required' }),
  z.object({ type: z.literal('log_loan_payment'), amount: safeAmount, loan_id: safeInt.optional(), loan_name: safeShortString.optional(), date: dateStr, notes: safeLongString.optional() }).refine(d => d.loan_id != null || d.loan_name, { message: 'loan_id or loan_name required' }),
  z.object({ type: z.literal('create_goal'), name: safeShortString, target_amount: safeAmount, target_date: dateStr, monthly_contribution: safeAmount.optional(), reason: safeLongString.optional(), notes: safeLongString.optional() }),
  z.object({ type: z.literal('create_reminder'), title: safeShortString, body: safeLongString.optional(), scheduledAt: safeShortString, repeat: safeShortString.optional(), category: safeShortString.optional() }),
  z.object({ type: z.literal('snooze_reminder'), id: safeInt, scheduledAt: safeShortString }),
  z.object({ type: z.literal('add_kb_entry'), content: safeLongString }),
  z.object({ type: z.literal('add_tax_record'), tax_year: safeInt.optional(), total_income: safeAmount.optional(), taxable_income: safeAmount.optional(), deductions: safeAmount.optional(), credits: safeAmount.optional(), tax_paid: safeAmount.optional(), estimated_tax_due: safeAmount.optional(), filing_status: safeShortString.optional(), notes: safeLongString.optional() }),
  z.object({ type: z.literal('add_wishlist_item'), name: safeShortString, price: safeAmount.optional(), priority: safeInt.optional(), category: safeShortString.optional(), target_date: dateStr, savings_allocated: safeAmount.optional(), notes: safeLongString.optional() }),
  z.object({ type: z.literal('add_document'), name: safeShortString, type_field: safeShortString.optional(), file_path: safeString(1000).optional(), tags: safeShortString.optional(), related_entity: safeShortString.optional(), related_id: safeInt.optional(), notes: safeLongString.optional() }),
  z.object({ type: z.literal('save_net_worth_snapshot'), total_assets: safeAmount.optional(), total_liabilities: safeAmount.optional(), snapshot_date: dateStr }),
  z.object({ type: z.literal('add_cash_flow_event'), name: safeShortString, type_field: safeShortString, amount: safeAmount, frequency: safeShortString.optional(), start_date: dateStr, end_date: dateStr, notes: safeLongString.optional() }),
  z.object({ type: z.literal('add_sinking_fund'), name: safeShortString, target_amount: safeAmount, current_amount: safeAmount.optional(), monthly_contribution: safeAmount, category: safeShortString.optional(), icon: safeShortString.optional(), color: safeShortString.optional(), notes: safeLongString.optional() }),
  z.object({ type: z.literal('contribute_to_sinking_fund'), amount: safeAmount, fund_id: safeInt.optional(), fund_name: safeShortString.optional() }).refine(d => d.fund_id != null || d.fund_name, { message: 'fund_id or fund_name required' }),
  z.object({ type: z.literal('save_health_score'), score: safeAmount, savings_rate: safeAmount, debt_to_income: safeAmount, budget_adherence: safeAmount, emergency_fund_months: safeAmount, investment_ratio: safeAmount, breakdown: z.record(z.unknown()).optional() }),
])

export type AgentAction = z.infer<typeof AgentActionSchema>

export function validateAgentAction(input: unknown):
  | { ok: true; action: AgentAction }
  | { ok: false; error: string } {
  if (!input || typeof input !== 'object') return { ok: false, error: 'Action must be an object' }
  const result = AgentActionSchema.safeParse(input)
  if (!result.success) {
    const first = result.error.errors[0]
    return { ok: false, error: `Invalid action: ${first?.path.join('.')} - ${first?.message}` }
  }
  return { ok: true, action: result.data }
}
