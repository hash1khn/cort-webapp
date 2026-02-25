import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { BreakdownItem } from '../../../lib/types/admin-dashboard';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
const RADIAN = Math.PI / 180;

const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    // adjusted radius to center the text better within the thicker slice
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percent < 0.05) return null; // Don't show label for very small slices

    return (
        <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={13} fontWeight="bold">
            {`${(percent * 100).toFixed(0)}%`}
        </text>
    );
};

interface DashboardChartsProps {
    ridesBreakdown: BreakdownItem[];
    expensesBreakdown: BreakdownItem[];
    revenueBreakdown: BreakdownItem[];
}

export function DashboardCharts({ ridesBreakdown, expensesBreakdown, revenueBreakdown }: DashboardChartsProps) {
    // Data check
    const hasRides = ridesBreakdown && ridesBreakdown.some(i => i.value > 0);
    const hasExpenses = expensesBreakdown && expensesBreakdown.some(i => i.value > 0);

    const totalRides = hasRides ? ridesBreakdown.reduce((sum, item) => sum + item.value, 0) : 0;
    const totalExpenses = hasExpenses ? expensesBreakdown.reduce((sum, item) => sum + item.value, 0) : 0;

    const hasRevenue = revenueBreakdown && revenueBreakdown.some(i => i.value > 0);
    const totalRevenue = hasRevenue ? revenueBreakdown.reduce((sum, item) => sum + item.value, 0) : 0;

    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
                                    labelLine={false}
                                    label={renderCustomizedLabel}
                                    innerRadius={40}
                                    outerRadius={90}
                                    paddingAngle={8}
                                    fill="#8884d8"
                                    dataKey="value"
                                    nameKey="name"
                                >
                                    {ridesBreakdown.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value: any) => {
                                        const percent = totalRides > 0 ? ((Number(value) / totalRides) * 100).toFixed(1) : '0';
                                        return [`${value} (${percent}%)`, 'Trips'];
                                    }}
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
                                    labelLine={false}
                                    label={renderCustomizedLabel}
                                    innerRadius={40}
                                    outerRadius={90}
                                    paddingAngle={8}
                                    fill="#8884d8"
                                    dataKey="value"
                                    nameKey="name"
                                >
                                    {expensesBreakdown.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value: any) => {
                                        const percent = totalExpenses > 0 ? ((Number(value) / totalExpenses) * 100).toFixed(1) : '0';
                                        const formattedValue = new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(value);
                                        return [`${formattedValue} (${percent}%)`, 'Cost'];
                                    }}
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

            {/* Revenue Breakdown */}
            <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-navy uppercase tracking-wider mb-4">Revenue Breakdown</h3>
                <div className="h-64 w-full">
                    {hasRevenue ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={revenueBreakdown}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={renderCustomizedLabel}
                                    innerRadius={40}
                                    outerRadius={90}
                                    paddingAngle={8}
                                    fill="#8884d8"
                                    dataKey="value"
                                    nameKey="name"
                                >
                                    {revenueBreakdown.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value: any) => {
                                        const percent = totalRevenue > 0 ? ((Number(value) / totalRevenue) * 100).toFixed(1) : '0';
                                        const formattedValue = new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(value);
                                        return [`${formattedValue} (${percent}%)`, 'Revenue'];
                                    }}
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
                        <div className="flex h-full items-center justify-center text-muted text-sm">No revenue data</div>
                    )}
                </div>
            </div>
        </div>
    );
}
