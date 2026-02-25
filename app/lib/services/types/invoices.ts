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
    companies?: {
        name: string;
    }
}
