export interface QueryInvoiceParams {
    page?: number;
    limit?: number;
    status?: string;
    company_id?: number;
    search?: string;
}

export interface Invoice {
    id: number;
    invoice_number: string;
    billing_month: string;
    total_amount: number;
    pdf_url?: string;
    generated_at: string;
    status: string;
    shuttle_contract_id?: number | null;
    amount_paid?: number | string | null;
    amount_remaining?: number | string | null;
    payment_status?: string | null;
    companies?: {
        name: string;
    }
}
