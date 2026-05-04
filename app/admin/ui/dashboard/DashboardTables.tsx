import { BreakdownItem, OverdueInvoice, ProblemReport } from "../../../lib/types/admin-dashboard";
import { ChevronRight, ExternalLink, AlertCircle, Fuel, Wrench, Users, ArrowUpRight, MessageSquare, Briefcase } from "lucide-react";

interface DashboardTablesProps {
    revenueByClient: BreakdownItem[];
    fuelExpenses: BreakdownItem[];
    repairExpenses: BreakdownItem[];
    overdueInvoices: OverdueInvoice[];
    problemReports: ProblemReport[];
}

function SimpleTable({ title, data, valueLabel, icon: Icon, colorClass }: { title: string; data: BreakdownItem[]; valueLabel: string; icon: any; colorClass: string }) {
    return (
        <div className="rounded-2xl border border-slate-200/60 bg-white overflow-hidden shadow-sm h-full transition-all hover:shadow-md">
            <div className={`p-5 flex items-center justify-between border-b border-slate-50 ${colorClass}`}>
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-white/80 shadow-sm">
                        <Icon className="w-4 h-4 text-slate-700" />
                    </div>
                    <div className="text-[13px] font-bold tracking-tight text-slate-800 uppercase">
                        {title}
                    </div>
                </div>
                <button className="text-slate-400 hover:text-navy transition-colors">
                    <ArrowUpRight className="w-4 h-4" />
                </button>
            </div>
            <div className="overflow-auto max-h-80 custom-scrollbar">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50/50 text-[10px] text-slate-400 uppercase tracking-widest sticky top-0 z-10">
                        <tr>
                            <th className="px-5 py-3 text-left font-bold">Category</th>
                            <th className="px-5 py-3 text-right font-bold">{valueLabel}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {data.length === 0 ? (
                            <tr>
                                <td colSpan={2} className="px-5 py-10 text-center">
                                    <p className="text-xs font-medium text-slate-300">No records available</p>
                                </td>
                            </tr>
                        ) : (
                            data.map((item, idx) => (
                                <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-5 py-3.5">
                                        <div className="flex flex-col">
                                            <span className="text-[13px] font-bold text-navy truncate max-w-[180px]" title={item.name}>
                                                {item.name}
                                            </span>
                                            <span className="text-[10px] text-slate-400 font-medium uppercase mt-0.5">Reference ID: {idx + 1024}</span>
                                        </div>
                                    </td>
                                    <td className="px-5 py-3.5 text-right">
                                        <span className="text-[13px] font-extrabold text-slate-700 group-hover:text-navy transition-colors">
                                            {new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(item.value)}
                                        </span>
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
        <div className="rounded-2xl border border-rose-100 bg-white overflow-hidden shadow-[0_15px_30px_-10px_rgba(225,29,72,0.08)] h-full lg:col-span-3">
            <div className="bg-rose-50/50 p-6 flex justify-between items-center border-b border-rose-50">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-rose-600 shadow-sm border border-rose-100">
                        <AlertCircle className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-[11px] font-extrabold text-rose-600 uppercase tracking-widest mb-0.5">Exposure Alert</div>
                        <div className="text-lg font-bold text-navy">Overdue Payables (&gt;30 Days)</div>
                    </div>
                </div>
                <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-200">
                    <ExternalLink className="w-3.5 h-3.5" />
                    Review All
                </div>
            </div>
            <div className="overflow-auto max-h-96 custom-scrollbar">
                <table className="w-full text-sm text-left border-collapse">
                    <thead className="bg-slate-50/80 backdrop-blur-sm px-6 py-4 text-[10px] text-slate-400 uppercase tracking-widst sticky top-0 z-20">
                        <tr>
                            <th className="px-6 py-4 font-bold">Billing Entity</th>
                            <th className="px-6 py-4 font-bold">Release Date</th>
                            <th className="px-6 py-4 font-bold">Cycle Status</th>
                            <th className="px-6 py-4 font-bold text-right">Outstanding Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 bg-white">
                        {invoices.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center">
                                    <div className="bg-emerald-50 text-emerald-600 px-6 py-3 rounded-2xl inline-flex items-center gap-2 font-bold text-sm">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                        Financial clearance: No overdue payments found
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            invoices.map((inv) => (
                                <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-navy group-hover:text-rose-600 transition-colors">{inv.company_name}</span>
                                            <span className="text-[10px] font-mono text-slate-400 uppercase mt-1">Invoice #{inv.invoice_number}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-xs font-semibold text-slate-500">
                                            {new Date(inv.generated_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-600 border border-rose-100 uppercase tracking-tighter">
                                            {inv.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="text-sm font-black text-rose-600">
                                            {new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(inv.total_amount)}
                                        </span>
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
        <div className="rounded-2xl border border-amber-100 bg-white overflow-hidden shadow-sm h-full lg:col-span-3">
            <div className="bg-amber-50/30 p-6 flex justify-between items-center border-b border-amber-50">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-amber-600 shadow-sm border border-amber-100">
                        <MessageSquare className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-[11px] font-extrabold text-amber-600 uppercase tracking-widest mb-0.5">Incident Queue</div>
                        <div className="text-lg font-bold text-navy">Field Problem Reports</div>
                    </div>
                </div>
                <div className="text-xs font-black text-amber-700 bg-amber-100/50 px-4 py-1.5 rounded-full border border-amber-200">
                    {reports.length} Reports
                </div>
            </div>
            <div className="overflow-auto max-h-96 custom-scrollbar">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50/80 backdrop-blur-sm px-6 py-4 text-[10px] text-slate-400 uppercase tracking-widest sticky top-0 z-20">
                        <tr>
                            <th className="px-6 py-4 font-bold">Timestamp</th>
                            <th className="px-6 py-4 font-bold">Originator</th>
                            <th className="px-6 py-4 font-bold">Affiliation</th>
                            <th className="px-6 py-4 font-bold">Status Brief</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 bg-white">
                        {reports.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center text-slate-300 font-medium">No active incident reports</td>
                            </tr>
                        ) : (
                            reports.map((report) => (
                                <tr key={report.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-navy">
                                                {new Date(report.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                            </span>
                                            <span className="text-[10px] text-slate-400">
                                                {new Date(report.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-navy">
                                                {report.reporter_name.split(' ').map(n => n[0]).join('')}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[13px] font-bold text-navy">{report.reporter_name}</span>
                                                <span className="text-[10px] text-slate-400 uppercase font-medium">{report.reporter_role}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1.5">
                                            <Briefcase className="w-3 h-3 text-slate-300" />
                                            <span className="text-xs font-semibold text-slate-600">{report.company_name || 'Individual'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-[12px] text-slate-700 leading-relaxed italic">
                                            "{report.message.length > 80 ? report.message.substring(0, 80) + '...' : report.message}"
                                        </div>
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

export function DashboardTables({ revenueByClient, fuelExpenses, repairExpenses, overdueInvoices, problemReports }: DashboardTablesProps) {
    return (
        <div className="space-y-10">
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                <SimpleTable 
                    title="Top Clients by Revenue" 
                    data={revenueByClient} 
                    valueLabel="Gross Revenue" 
                    icon={Users}
                    colorClass="bg-blue-50/30"
                />
                <SimpleTable 
                    title="Fuel Consumption" 
                    data={fuelExpenses} 
                    valueLabel="Total Cost" 
                    icon={Fuel}
                    colorClass="bg-orange-50/30"
                />
                <SimpleTable 
                    title="Maintenance Costs" 
                    data={repairExpenses} 
                    valueLabel="Expense" 
                    icon={Wrench}
                    colorClass="bg-slate-50/30"
                />
            </div>
            
            <div className="grid gap-8 lg:grid-cols-3">
                <OverdueInvoicesTable invoices={overdueInvoices || []} />
                <ProblemReportsTable reports={problemReports || []} />
            </div>
        </div>
    );
}
