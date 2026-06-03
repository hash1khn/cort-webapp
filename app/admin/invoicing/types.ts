export interface Invoice {
  id: number;
  invoice_number: string;
  billing_month: string;
  billing_period?: "MONTHLY" | "WEEKLY" | null;
  period_start?: string | null;
  period_end?: string | null;
  generated_at: string;
  total_amount: number | string;
  status: string;
  companies?: { name: string } | null;
  shuttle_contract_id?: number | null;
  amount_paid?: number | string | null;
  amount_remaining?: number | string | null;
  payment_status?: string | null;
}

export interface InvoiceStats {
  totalCollectable: number;
  totalCollected: number;
  totalOverdue: number;
}

export interface PaginationMeta {
  page: number;
  pages: number;
  total: number;
}
