"use client";

import { useState, useEffect, memo } from "react";
import { ChauffeurBooking, TripType } from "../../../../lib/services/api-client";

export const DailyLogsModal = memo(function DailyLogsModal({ isOpen, onClose, onSubmit, booking }: { isOpen: boolean; onClose: () => void; onSubmit: (data: any) => void; booking: ChauffeurBooking | null }) {
    const [dailyLogs, setDailyLogs] = useState<any[]>([]);

    useEffect(() => {
        if (isOpen && booking) {
            if (booking.chauffeur_trip_daily_logs && booking.chauffeur_trip_daily_logs.length > 0) {
                setDailyLogs(booking.chauffeur_trip_daily_logs.map(log => ({
                    id: log.id,
                    date: new Date(log.log_date),
                    trip_type: log.trip_type,
                    is_full_day: log.is_full_day,
                    apply_accommodation: log.apply_accommodation,
                    hours_used: log.hours_used ? log.hours_used.toString() : ''
                })));
            } else {
                const startDate = booking.chauffeur_trip_logs?.start_time
                    ? new Date(booking.chauffeur_trip_logs.start_time)
                    : new Date(booking.scheduled_for);

                const endDate = new Date();

                const days: any[] = [];
                let currentDate = new Date(startDate);
                const loopEnd = new Date(endDate);

                currentDate.setHours(0, 0, 0, 0);
                loopEnd.setHours(0, 0, 0, 0);

                while (currentDate <= loopEnd) {
                    const dateStr = currentDate.toISOString().split('T')[0];
                    const isOutstation = booking.trip_type === TripType.OUT_STATION;
                    const defaultHours = booking.package_selected === 'HOURS_24' ? 0 : (booking.package_selected === 'HOURS_5' ? 5 : 10);

                    days.push({
                        id: dateStr,
                        date: new Date(currentDate),
                        trip_type: isOutstation ? TripType.OUT_STATION : TripType.IN_CITY,
                        is_full_day: booking.package_selected === 'HOURS_24',
                        apply_accommodation: false,
                        hours_used: defaultHours > 0 ? defaultHours.toString() : ''
                    });

                    currentDate.setDate(currentDate.getDate() + 1);
                }
                setDailyLogs(days);
            }
        }
    }, [isOpen, booking]);

    if (!isOpen) return null;

    const updateLog = (index: number, field: string, value: any) => {
        const newLogs = [...dailyLogs];
        newLogs[index] = { ...newLogs[index], [field]: value };
        setDailyLogs(newLogs);
    };

    const handleSubmit = () => {
        const data = {
            daily_logs: dailyLogs.map(log => {
                const d = log.date;
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                return {
                    date: `${year}-${month}-${day}`,
                    trip_type: log.trip_type,
                    is_full_day: log.is_full_day,
                    apply_accommodation: log.apply_accommodation || false,
                    hours_used: log.hours_used ? parseFloat(log.hours_used) : 0
                };
            })
        };
        onSubmit(data);
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-semibold text-navy mb-4">Manage Daily Logs</h3>

                <div className="border border-border rounded-lg overflow-hidden mb-6">
                    <table className="w-full text-sm">
                        <thead className="bg-surface text-xs font-semibold text-muted text-left">
                            <tr>
                                <th className="px-3 py-2">Date</th>
                                <th className="px-3 py-2">Type</th>
                                <th className="px-3 py-2 w-24">Hours</th>
                                <th className="px-3 py-2 text-center w-20">Full Day</th>
                                <th className="px-3 py-2 text-center w-20">Accom.</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {dailyLogs.map((log, idx) => (
                                <tr key={idx}>
                                    <td className="px-3 py-2 font-medium">
                                        {log.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' })}
                                    </td>
                                    <td className="px-3 py-2">
                                        <select className="w-full rounded border border-border p-1 text-xs" value={log.trip_type} onChange={(e) => updateLog(idx, 'trip_type', e.target.value)}>
                                            <option value={TripType.IN_CITY}>In City</option>
                                            <option value={TripType.OUT_STATION}>Outstation</option>
                                        </select>
                                    </td>
                                    <td className="px-3 py-2">
                                        <input type="number" className="w-full rounded border border-border p-1 text-xs disabled:bg-surface/50" placeholder="Hrs" value={log.hours_used} disabled={log.is_full_day} onChange={(e) => updateLog(idx, 'hours_used', e.target.value)} />
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                        <input type="checkbox" checked={log.is_full_day} onChange={(e) => {
                                            const val = e.target.checked;
                                            const newLogs = [...dailyLogs];
                                            newLogs[idx] = { ...newLogs[idx], is_full_day: val, hours_used: val ? "0" : newLogs[idx].hours_used };
                                            setDailyLogs(newLogs);
                                        }} className="rounded border-border" disabled={booking?.package_selected !== 'HOURS_24' && booking?.package_selected !== 'HOURS_10'} />
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                        <input type="checkbox" checked={log.apply_accommodation} onChange={(e) => updateLog(idx, 'apply_accommodation', e.target.checked)} className="rounded border-border" />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-border">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-muted hover:bg-surface rounded">Cancel</button>
                    <button onClick={handleSubmit} className="px-4 py-2 text-sm font-semibold text-white bg-blue rounded hover:opacity-90">
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
});
