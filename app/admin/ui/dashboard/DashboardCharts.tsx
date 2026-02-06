import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { BreakdownItem } from '../../../lib/types/admin-dashboard';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

interface DashboardChartsProps {
    ridesBreakdown: BreakdownItem[];
    expensesBreakdown: BreakdownItem[];
}

export function DashboardCharts({ ridesBreakdown, expensesBreakdown }: DashboardChartsProps) {
    // Data check
    const hasRides = ridesBreakdown && ridesBreakdown.some(i => i.value > 0);
    const hasExpenses = expensesBreakdown && expensesBreakdown.some(i => i.value > 0);

    return (
        <div className="grid gap-6 md:grid-cols-2">
            {/* Rides Breakdown */}
            <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-navy uppercase tracking-wider mb-4">Rides Breakdown</h3>
                <div className="h-64 w-full">
                    {hasRides ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={ridesBreakdown}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    paddingAngle={5}
                                    dataKey="value"
                                    nameKey="name"
                                >
                                    {ridesBreakdown.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value: any) => [value, 'Trips']}
                                    contentStyle={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                />
                                <Legend
                                    verticalAlign="bottom"
                                    height={36}
                                    iconType="circle"
                                    iconSize={10}
                                    formatter={(value) => <span className="text-sm font-medium text-navy">{value}</span>}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex h-full items-center justify-center text-muted text-sm">No rides data</div>
                    )}
                </div>
            </div>

            {/* Expenses Breakdown */}
            <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-navy uppercase tracking-wider mb-4">Expenses Breakdown</h3>
                <div className="h-64 w-full">
                    {hasExpenses ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={expensesBreakdown}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    paddingAngle={5}
                                    dataKey="value"
                                    nameKey="name"
                                >
                                    {expensesBreakdown.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value: any) => [
                                        new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(value),
                                        'Cost'
                                    ]}
                                    contentStyle={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                />
                                <Legend
                                    verticalAlign="bottom"
                                    height={36}
                                    iconType="circle"
                                    iconSize={10}
                                    formatter={(value) => <span className="text-sm font-medium text-navy">{value}</span>}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex h-full items-center justify-center text-muted text-sm">No expenses data</div>
                    )}
                </div>
            </div>
        </div>
    );
}
