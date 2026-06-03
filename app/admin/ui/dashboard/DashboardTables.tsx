import type { ComponentType } from "react";
import { BreakdownItem, OverdueInvoice, ProblemReport } from "../../../lib/types/admin-dashboard";
import { ExternalLink, AlertCircle, Fuel, Wrench, Users, ArrowUpRight, MessageSquare, Tag } from "lucide-react";
import { adminCard, adminTableHead, adminTableRow } from "../../components/ui/admin-styles";
import { cx } from "../../components/ui/cx";

interface DashboardTablesProps {
  revenueByClient: BreakdownItem[];
  fuelExpenses: BreakdownItem[];
  repairExpenses: BreakdownItem[];
  overdueInvoices: OverdueInvoice[];
  problemReports: ProblemReport[];
}

function SimpleTable({
  title,
  data,
  valueLabel,
  icon: Icon,
  colorClass,
}: {
  title: string;
  data: BreakdownItem[];
  valueLabel: string;
  icon: ComponentType<{ className?: string }>;
  colorClass: string;
}) {
  return (
    <div className={cx(adminCard, "overflow-hidden h-full transition-all hover:shadow-[var(--shadow-card-hover)]")}>
      <div className={cx("p-5 flex items-center justify-between border-b border-[var(--border-default)]", colorClass)}>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[var(--bg-card)] shadow-sm border border-[var(--border-default)]">
            <Icon className="w-4 h-4 text-[var(--text-secondary)]" />
          </div>
          <div className="text-[13px] font-bold tracking-tight text-[var(--text-primary)] uppercase">{title}</div>
        </div>
        <button className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
          <ArrowUpRight className="w-4 h-4" />
        </button>
      </div>
      <div className="overflow-auto max-h-80 custom-scrollbar">
        <table className="w-full text-sm">
          <thead className={cx(adminTableHead, "sticky top-0 z-10 px-5 py-3")}>
            <tr>
              <th className="px-5 py-3 text-left font-bold">Category</th>
              <th className="px-5 py-3 text-right font-bold">{valueLabel}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--divider)]">
            {data.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-5 py-10 text-center">
                  <p className="text-xs font-medium text-[var(--text-muted)]">No records available</p>
                </td>
              </tr>
            ) : (
              data.map((item, idx) => (
                <tr key={idx} className={cx(adminTableRow, "group")}>
                  <td className="px-5 py-3.5">
                    <div className="flex flex-col">
                      <span
                        className="text-[13px] font-bold text-[var(--text-primary)] truncate max-w-[180px]"
                        title={item.name}
                      >
                        {item.name}
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)] font-medium uppercase mt-0.5">
                        Reference ID: {idx + 1024}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <span className="text-[13px] font-extrabold text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
                      {new Intl.NumberFormat("en-PK", {
                        style: "currency",
                        currency: "PKR",
                        maximumFractionDigits: 0,
                      }).format(item.value)}
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
    <div className="rounded-2xl border border-rose-500/20 bg-[var(--bg-card)] overflow-hidden shadow-[var(--shadow-card)] h-full lg:col-span-3">
      <div className="bg-rose-500/10 p-6 flex justify-between items-center border-b border-[var(--border-default)]">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[var(--bg-card)] flex items-center justify-center text-rose-500 shadow-sm border border-rose-500/20">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-extrabold text-rose-500 uppercase tracking-widest mb-0.5">
              Exposure Alert
            </div>
            <div className="text-lg font-bold text-[var(--text-primary)]">Overdue Payables (&gt;30 Days)</div>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold">
          <ExternalLink className="w-3.5 h-3.5" />
          Review All
        </div>
      </div>
      <div className="overflow-auto max-h-96 custom-scrollbar">
        <table className="w-full text-sm text-left border-collapse">
          <thead className={cx(adminTableHead, "sticky top-0 z-20 px-6 py-4")}>
            <tr>
              <th className="px-6 py-4 font-bold">Billing Entity</th>
              <th className="px-6 py-4 font-bold">Release Date</th>
              <th className="px-6 py-4 font-bold">Cycle Status</th>
              <th className="px-6 py-4 font-bold text-right">Outstanding Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--divider)] bg-[var(--bg-card)]">
            {invoices.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center">
                  <div className="bg-emerald-500/10 text-emerald-500 px-6 py-3 rounded-2xl inline-flex items-center gap-2 font-bold text-sm">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Financial clearance: No overdue payments found
                  </div>
                </td>
              </tr>
            ) : (
              invoices.map((inv) => (
                <tr key={inv.id} className={adminTableRow}>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-[var(--text-primary)] group-hover:text-rose-500 transition-colors">
                        {inv.company_name}
                      </span>
                      <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase mt-1">
                        Invoice #{inv.invoice_number}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-semibold text-[var(--text-muted)]">
                      {new Date(inv.generated_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-extrabold bg-rose-500/10 text-rose-500 border border-rose-500/20 uppercase tracking-tighter">
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-sm font-black text-rose-500">
                      {new Intl.NumberFormat("en-PK", {
                        style: "currency",
                        currency: "PKR",
                        maximumFractionDigits: 0,
                      }).format(inv.total_amount)}
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

function formatProblemIssueType(issueType: ProblemReport["issue_type"]): string {
  if (!issueType) return "-";
  switch (issueType) {
    case "app_issue":
      return "App issue";
    case "ride_issue":
      return "Ride issue";
    case "other":
      return "Other";
    default:
      return "-";
  }
}

function ProblemReportsTable({ reports }: { reports: ProblemReport[] }) {
  return (
    <div className="rounded-2xl border border-amber-500/20 bg-[var(--bg-card)] overflow-hidden shadow-[var(--shadow-card)] h-full lg:col-span-3">
      <div className="bg-amber-500/10 p-6 flex justify-between items-center border-b border-[var(--border-default)]">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[var(--bg-card)] flex items-center justify-center text-amber-500 shadow-sm border border-amber-500/20">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-extrabold text-amber-500 uppercase tracking-widest mb-0.5">
              Incident Queue
            </div>
            <div className="text-lg font-bold text-[var(--text-primary)]">Field Problem Reports</div>
          </div>
        </div>
        <div className="text-xs font-black text-amber-600 bg-amber-500/15 px-4 py-1.5 rounded-full border border-amber-500/20">
          {reports.length} Reports
        </div>
      </div>
      <div className="overflow-auto max-h-96 custom-scrollbar">
        <table className="w-full text-sm text-left">
          <thead className={cx(adminTableHead, "sticky top-0 z-20 px-6 py-4")}>
            <tr>
              <th className="px-6 py-4 font-bold">Timestamp</th>
              <th className="px-6 py-4 font-bold">Originator</th>
              <th className="px-6 py-4 font-bold">Issue type</th>
              <th className="px-6 py-4 font-bold">Status Brief</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--divider)] bg-[var(--bg-card)]">
            {reports.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-[var(--text-muted)] font-medium">
                  No active incident reports
                </td>
              </tr>
            ) : (
              reports.map((report) => (
                <tr key={report.id} className={adminTableRow}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-[var(--text-primary)]">
                        {new Date(report.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)]">
                        {new Date(report.created_at).toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[var(--bg-subtle)] flex items-center justify-center text-[10px] font-bold text-[var(--text-primary)]">
                        {report.reporter_name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[13px] font-bold text-[var(--text-primary)]">
                          {report.reporter_name}
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)] uppercase font-medium">
                          {report.reporter_role}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5">
                      <Tag className="w-3 h-3 text-[var(--text-muted)] shrink-0" />
                      <span className="text-xs font-semibold text-[var(--text-secondary)]">
                        {formatProblemIssueType(report.issue_type)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="bg-[var(--bg-subtle)] p-3 rounded-xl border border-[var(--border-default)] text-[12px] text-[var(--text-secondary)] leading-relaxed italic">
                      &quot;
                      {report.message.length > 80
                        ? report.message.substring(0, 80) + "..."
                        : report.message}
                      &quot;
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

export function DashboardTables({
  revenueByClient,
  fuelExpenses,
  repairExpenses,
  overdueInvoices,
  problemReports,
}: DashboardTablesProps) {
  return (
    <div className="space-y-10">
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        <SimpleTable
          title="Top Clients by Revenue"
          data={revenueByClient}
          valueLabel="Gross Revenue"
          icon={Users}
          colorClass="bg-blue-500/5"
        />
        <SimpleTable
          title="Fuel Consumption"
          data={fuelExpenses}
          valueLabel="Total Cost"
          icon={Fuel}
          colorClass="bg-orange-500/5"
        />
        <SimpleTable
          title="Maintenance Costs"
          data={repairExpenses}
          valueLabel="Expense"
          icon={Wrench}
          colorClass="bg-[var(--bg-subtle)]"
        />
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <OverdueInvoicesTable invoices={overdueInvoices || []} />
        <ProblemReportsTable reports={problemReports || []} />
      </div>
    </div>
  );
}
