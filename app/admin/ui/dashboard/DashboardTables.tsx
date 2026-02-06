import { BreakdownItem } from "../../../lib/types/admin-dashboard";

interface DashboardTablesProps {
    revenueByClient: BreakdownItem[];
    fuelExpenses: BreakdownItem[];
    repairExpenses: BreakdownItem[];
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

export function DashboardTables({ revenueByClient, fuelExpenses, repairExpenses }: DashboardTablesProps) {
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
        </div>
    );
}
