import type { ComponentType } from "react";
import { BreakdownItem, OverdueInvoice, ProblemReport } from "../../../lib/types/admin-dashboard";
import { AlertCircle, Fuel, Wrench, Users, MessageSquare, Tag } from "lucide-react";
import { adminTableHead, adminTableRow } from "../../components/ui/admin-styles";
import { BentoTile } from "./BentoTile";
import { cx } from "../../components/ui/cx";

interface DashboardTablesProps {
  revenueByClient: BreakdownItem[];
  fuelExpenses: BreakdownItem[];
  repairExpenses: BreakdownItem[];
  overdueInvoices: OverdueInvoice[];
  problemReports: ProblemReport[];
  className?: string;
}

function formatCurrency(val: number) {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(val);
}

function SimpleTable({
  title,
  data,
  valueLabel,
  icon: Icon,
}: {
  title: string;
  data: BreakdownItem[];
  valueLabel: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <BentoTile padding="none" className="overflow-hidden h-full">
      <div className="px-3.5 py-3 flex items-center gap-2.5 border-b border-[var(--border-default)]">
        <div className="p-1.5 rounded-md bg-[var(--bg-subtle)] border border-[var(--border-default)]">
          <Icon className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
        </div>
        <div className="text-xs font-semibold tracking-tight text-[var(--text-primary)]">{title}</div>
      </div>
      <div className="overflow-auto max-h-64 custom-scrollbar">
        <table className="w-full text-sm">
          <thead className={cx(adminTableHead, "sticky top-0 z-10")}>
            <tr>
              <th className="px-3.5 py-2 text-left font-semibold text-[10px]">Name</th>
              <th className="px-3.5 py-2 text-right font-semibold text-[10px]">{valueLabel}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--divider)]">
            {data.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-3.5 py-8 text-center">
                  <p className="text-xs font-medium text-[var(--text-muted)]">No records</p>
                </td>
              </tr>
            ) : (
              data.map((item, idx) => (
                <tr key={idx} className={cx(adminTableRow, "group")}>
                  <td className="px-3.5 py-2.5">
                    <span
                      className="text-xs font-semibold text-[var(--text-primary)] truncate max-w-[160px] block"
                      title={item.name}
                    >
                      {item.name}
                    </span>
                  </td>
                  <td className="px-3.5 py-2.5 text-right">
                    <span className="text-xs font-bold text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
                      {formatCurrency(item.value)}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </BentoTile>
  );
}

function OverdueInvoicesTable({ invoices }: { invoices: OverdueInvoice[] }) {
  return (
    <BentoTile padding="none" className="overflow-hidden h-full">
      <div className="px-3.5 py-3 flex justify-between items-center border-b border-[var(--border-default)]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[var(--bg-subtle)] flex items-center justify-center text-[var(--text-secondary)] border border-[var(--border-default)]">
            <AlertCircle className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Overdue</div>
            <div className="text-sm font-semibold text-[var(--text-primary)]">Invoices &gt;30 days</div>
          </div>
        </div>
        <span className="text-[11px] font-bold text-[var(--text-secondary)] bg-[var(--bg-subtle)] px-2.5 py-1 rounded-full">
          {invoices.length}
        </span>
      </div>
      <div className="overflow-auto max-h-72 custom-scrollbar">
        <table className="w-full text-sm text-left">
          <thead className={cx(adminTableHead, "sticky top-0 z-20")}>
            <tr>
              <th className="px-3.5 py-2 font-semibold text-[10px]">Entity</th>
              <th className="px-3.5 py-2 font-semibold text-[10px]">Date</th>
              <th className="px-3.5 py-2 font-semibold text-[10px]">Status</th>
              <th className="px-3.5 py-2 font-semibold text-[10px] text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--divider)]">
            {invoices.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3.5 py-8 text-center">
                  <span className="text-xs font-medium text-emerald-600">No overdue payments</span>
                </td>
              </tr>
            ) : (
              invoices.map((inv) => (
                <tr key={inv.id} className={adminTableRow}>
                  <td className="px-3.5 py-2.5">
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-[var(--text-primary)]">{inv.company_name}</span>
                      <span className="text-[10px] font-mono text-[var(--text-muted)]">#{inv.invoice_number}</span>
                    </div>
                  </td>
                  <td className="px-3.5 py-2.5">
                    <span className="text-[11px] font-medium text-[var(--text-muted)]">
                      {new Date(inv.generated_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </td>
                  <td className="px-3.5 py-2.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/10 text-rose-500 uppercase">
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-3.5 py-2.5 text-right">
                    <span className="text-xs font-bold text-rose-500">{formatCurrency(inv.total_amount)}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </BentoTile>
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
    <BentoTile padding="none" className="overflow-hidden h-full">
      <div className="px-3.5 py-3 flex justify-between items-center border-b border-[var(--border-default)]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[var(--bg-subtle)] flex items-center justify-center text-[var(--text-secondary)] border border-[var(--border-default)]">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Incidents</div>
            <div className="text-sm font-semibold text-[var(--text-primary)]">Problem reports</div>
          </div>
        </div>
        <span className="text-[11px] font-bold text-[var(--text-secondary)] bg-[var(--bg-subtle)] px-2.5 py-1 rounded-full">
          {reports.length}
        </span>
      </div>
      <div className="overflow-auto max-h-72 custom-scrollbar">
        <table className="w-full text-sm text-left">
          <thead className={cx(adminTableHead, "sticky top-0 z-20")}>
            <tr>
              <th className="px-3.5 py-2 font-semibold text-[10px]">When</th>
              <th className="px-3.5 py-2 font-semibold text-[10px]">Who</th>
              <th className="px-3.5 py-2 font-semibold text-[10px]">Type</th>
              <th className="px-3.5 py-2 font-semibold text-[10px]">Message</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--divider)]">
            {reports.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3.5 py-8 text-center text-[var(--text-muted)] text-xs font-medium">
                  No active reports
                </td>
              </tr>
            ) : (
              reports.map((report) => (
                <tr key={report.id} className={adminTableRow}>
                  <td className="px-3.5 py-2.5 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="text-[11px] font-semibold text-[var(--text-primary)]">
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
                  <td className="px-3.5 py-2.5">
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-[var(--text-primary)]">{report.reporter_name}</span>
                      <span className="text-[10px] text-[var(--text-muted)] uppercase">{report.reporter_role}</span>
                    </div>
                  </td>
                  <td className="px-3.5 py-2.5">
                    <div className="flex items-center gap-1">
                      <Tag className="w-3 h-3 text-[var(--text-muted)] shrink-0" />
                      <span className="text-[11px] font-medium text-[var(--text-secondary)]">
                        {formatProblemIssueType(report.issue_type)}
                      </span>
                    </div>
                  </td>
                  <td className="px-3.5 py-2.5">
                    <p className="text-[11px] text-[var(--text-secondary)] line-clamp-2 max-w-xs">
                      {report.message}
                    </p>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </BentoTile>
  );
}

export function DashboardTables({
  revenueByClient,
  fuelExpenses,
  repairExpenses,
  overdueInvoices,
  problemReports,
  className,
}: DashboardTablesProps) {
  return (
    <div className={cx("space-y-5", className)}>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <SimpleTable
          title="Top clients"
          data={revenueByClient}
          valueLabel="Revenue"
          icon={Users}
        />
        <SimpleTable title="Fuel" data={fuelExpenses} valueLabel="Cost" icon={Fuel} />
        <SimpleTable title="Maintenance" data={repairExpenses} valueLabel="Cost" icon={Wrench} />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <OverdueInvoicesTable invoices={overdueInvoices || []} />
        <ProblemReportsTable reports={problemReports || []} />
      </div>
    </div>
  );
}
