import { BreakdownItem, OverdueInvoice, ProblemReport } from "../../../lib/types/admin-dashboard";

interface DashboardTablesProps {
    revenueByClient: BreakdownItem[];
    fuelExpenses: BreakdownItem[];
    repairExpenses: BreakdownItem[];
    overdueInvoices: OverdueInvoice[];
    problemReports: ProblemReport[];
}

function SimpleTable({ title, data, valueLabel }: { title: string; data: BreakdownItem[]; valueLabel: string }) {
    return (
        <div className="rounded-xl border border-border bg-white overflow-hidden shadow-sm h-full">
            <div className="border-b border-border bg-zinc-50/50 p-4">
                <div className="text-xs font-semibold tracking-wider text-navy uppercase">
                    {title}
                </div>
            </div>
            <div className="overflow-auto max-h-80">
                <table className="w-full text-sm">
                    <thead className="bg-zinc-50 text-xs text-muted sticky top-0">
                        <tr>
                            <th className="px-4 py-2 text-left font-medium">Name</th>
                            <th className="px-4 py-2 text-right font-medium">{valueLabel}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {data.length === 0 ? (
                            <tr>
                                <td colSpan={2} className="px-4 py-4 text-center text-muted text-xs">No data</td>
                            </tr>
                        ) : (
                            data.map((item, idx) => (
                                <tr key={idx} className="hover:bg-zinc-50/50">
                                    <td className="px-4 py-2.5 text-navy truncate max-w-[200px]" title={item.name}>
                                        {item.name}
                                    </td>
                                    <td className="px-4 py-2.5 text-right font-medium text-navy">
                                        {new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(item.value)}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function OverdueInvoicesTable({ invoices }: { invoices: OverdueInvoice[] }) {
    return (
        <div className="rounded-xl border border-red-200 bg-white overflow-hidden shadow-sm h-full lg:col-span-3">
            <div className="border-b border-red-100 bg-red-50 p-4 flex justify-between items-center">
                <div className="text-xs font-semibold tracking-wider text-red-800 uppercase flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                    Overdue Invoices (&gt;30 Days)
                </div>
                <div className="text-xs font-bold text-red-600 bg-white px-2 py-1 rounded-full shadow-sm">Action Required</div>
            </div>
            <div className="overflow-auto max-h-80">
                <table className="w-full text-sm text-left">
                    <thead className="bg-red-50/50 text-xs text-red-800 sticky top-0 z-10 shadow-sm shadow-red-100/50">
                        <tr>
                            <th className="px-4 py-3 font-medium">Invoice #</th>
                            <th className="px-4 py-3 font-medium">Client</th>
                            <th className="px-4 py-3 font-medium">Generated At</th>
                            <th className="px-4 py-3 font-medium">Status</th>
                            <th className="px-4 py-3 font-medium text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-red-100 bg-white">
                        {invoices.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-4 py-6 text-center text-slate-500 font-medium text-sm">No overdue invoices older than 30 days. Good job!</td>
                            </tr>
                        ) : (
                            invoices.map((inv) => (
                                <tr key={inv.id} className="hover:bg-red-50/50 transition-colors group">
                                    <td className="px-4 py-3 font-mono text-xs text-slate-600 group-hover:text-red-700 transition-colors">{inv.invoice_number}</td>
                                    <td className="px-4 py-3 font-medium text-slate-800">{inv.company_name}</td>
                                    <td className="px-4 py-3 text-slate-500">{new Date(inv.generated_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                                    <td className="px-4 py-3">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">
                                            {inv.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right font-bold text-red-600">
                                        {new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(inv.total_amount)}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function ProblemReportsTable({ reports }: { reports: ProblemReport[] }) {
    return (
        <div className="rounded-xl border border-amber-200 bg-white overflow-hidden shadow-sm h-full lg:col-span-3">
            <div className="border-b border-amber-100 bg-amber-50 p-4 flex justify-between items-center">
                <div className="text-xs font-semibold tracking-wider text-amber-900 uppercase">
                    Reported Problems
                </div>
                <div className="text-xs font-bold text-amber-700 bg-white px-2 py-1 rounded-full shadow-sm">
                    {reports.length} Total
                </div>
            </div>
            <div className="overflow-auto max-h-96">
                <table className="w-full text-sm text-left">
                    <thead className="bg-amber-50/50 text-xs text-amber-900 sticky top-0 z-10">
                        <tr>
                            <th className="px-4 py-3 font-medium">Reported At</th>
                            <th className="px-4 py-3 font-medium">Reporter</th>
                            <th className="px-4 py-3 font-medium">Role</th>
                            <th className="px-4 py-3 font-medium">Company</th>
                            <th className="px-4 py-3 font-medium">Message</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-100 bg-white">
                        {reports.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-4 py-6 text-center text-slate-500 font-medium text-sm">
                                    No problems reported yet.
                                </td>
                            </tr>
                        ) : (
                            reports.map((report) => (
                                <tr key={report.id} className="hover:bg-amber-50/40 transition-colors">
                                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                                        {new Date(report.created_at).toLocaleString('en-US', {
                                            year: 'numeric',
                                            month: 'short',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="font-medium text-slate-800">{report.reporter_name}</div>
                                        <div className="text-xs text-slate-500">{report.reporter_email}</div>
                                    </td>
                                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{report.reporter_role}</td>
                                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{report.company_name || '-'}</td>
                                    <td className="px-4 py-3 text-slate-700 min-w-[320px]">{report.message}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export function DashboardTables({ revenueByClient, fuelExpenses, repairExpenses, overdueInvoices, problemReports }: DashboardTablesProps) {
    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <SimpleTable
                title="Revenue by Client"
                data={revenueByClient}
                valueLabel="Revenue"
            />
            <SimpleTable
                title="Top Fuel Consumers"
                data={fuelExpenses}
                valueLabel="Fuel Cost"
            />
            <SimpleTable
                title="Top Maintenance Costs"
                data={repairExpenses}
                valueLabel="Cost"
            />
            <OverdueInvoicesTable invoices={overdueInvoices || []} />
            <ProblemReportsTable reports={problemReports || []} />
        </div>
    );
}
