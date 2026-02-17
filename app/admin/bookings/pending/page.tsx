"use client";

import { useMemo, useState, useEffect } from "react";
import { DriverType, ChauffeurBooking, PaymentTransaction, PaymentSummary, TripType } from "../../../lib/services/api-client";
import Map, { type MapMarker } from "../../ui/Map";
import Modal from "../../../company/bookings/components/Modal";
import Pagination from "../../../components/ui/Pagination";
import { useAppDispatch, useAppSelector } from "../../../lib/store/hooks";
import {
  fetchAdminBookings,
  fetchAvailableVehicles,
  fetchAvailableDrivers,
  assignBooking,
  updateBookingStatus,
  startTrip,
  endTrip,
  completeTrip,
  generateTripInvoice,
  updateDailyLogs,
  addPayment,
  fetchPaymentHistory,
  fetchPaymentSummary,
  selectAdminBookings,
  selectAvailableVehicles,
  selectAvailableDrivers,
  selectAdminBookingsStatus,
  selectAdminBookingsPagination,
  selectPaymentHistory,
  selectPaymentSummary
} from "../../../lib/store/slices/adminBookingsSlice";
import { uploadFile } from "../../../lib/supabase";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    timeZone: 'Asia/Karachi', // GMT+5
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

function EndTripModal({ isOpen, onClose, onSubmit, booking, loading }: { isOpen: boolean; onClose: () => void; onSubmit: (data: any) => void; booking: ChauffeurBooking | null; loading?: boolean }) {
  const [distance, setDistance] = useState("0");
  const [toll, setToll] = useState("0");
  const [parking, setParking] = useState("0");
  const [useManualEndTime, setUseManualEndTime] = useState(false);
  const [manualEndTime, setManualEndTime] = useState("");
  const [dailyLogs, setDailyLogs] = useState<any[]>([]);
  const [showDailyBreakdown, setShowDailyBreakdown] = useState(false);
  const [tollImage, setTollImage] = useState<File | null>(null);
  const [parkingImage, setParkingImage] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (isOpen && booking) {
      const startDate = booking.chauffeur_trip_logs?.start_time
        ? new Date(booking.chauffeur_trip_logs.start_time)
        : new Date(booking.scheduled_for);

      const endDate = (useManualEndTime && manualEndTime)
        ? new Date(manualEndTime)
        : new Date();

      const existingLogDates = new Set(
        (booking.chauffeur_trip_daily_logs || []).map(log => {
          const d = new Date(log.log_date);
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        })
      );

      const days: any[] = [];
      let currentDate = new Date(startDate);
      const loopEnd = new Date(endDate);

      currentDate.setHours(0, 0, 0, 0);
      loopEnd.setHours(0, 0, 0, 0);

      while (currentDate <= loopEnd) {
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        // ONLY add to modal if NOT already logged in DB
        if (!existingLogDates.has(dateStr)) {
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
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }
      setDailyLogs(days);
    }
  }, [isOpen, booking, manualEndTime, useManualEndTime]);

  if (!isOpen) return null;

  const updateLog = (index: number, field: string, value: any) => {
    const newLogs = [...dailyLogs];
    newLogs[index] = { ...newLogs[index], [field]: value };
    setDailyLogs(newLogs);
  };

  const handleSubmit = async () => {
    setIsUploading(true);
    let tollImageUrl = "";
    let parkingImageUrl = "";

    try {
      if (tollImage) {
        const path = `receipts/toll/${booking?.id}_${Date.now()}_${tollImage.name}`;
        tollImageUrl = await uploadFile("company-logos", path, tollImage);
      }
      if (parkingImage) {
        const path = `receipts/parking/${booking?.id}_${Date.now()}_${parkingImage.name}`;
        parkingImageUrl = await uploadFile("company-logos", path, parkingImage);
      }

      const data: any = {
        total_distance_km: parseFloat(distance),
        expense_toll: parseFloat(toll),
        expense_parking: parseFloat(parking),
        expense_toll_image_url: tollImageUrl || undefined,
        expense_parking_image_url: parkingImageUrl || undefined,
      };

      if (useManualEndTime && manualEndTime) {
        data.end_time = new Date(manualEndTime).toISOString();
      }

      // Combine existing logs (incremental) with new logs from this modal
      const existingLogs = (booking?.chauffeur_trip_daily_logs || []).map(log => {
        const d = new Date(log.log_date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return {
          date: `${year}-${month}-${day}`,
          trip_type: log.trip_type,
          is_full_day: log.is_full_day,
          apply_accommodation: log.apply_accommodation,
          hours_used: log.hours_used ? parseFloat(log.hours_used.toString()) : 0
        };
      });

      const newLogs = dailyLogs.map(log => {
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
      });

      data.daily_logs = [...existingLogs, ...newLogs];

      onSubmit(data);
    } catch (error) {
      console.error("Upload failed", error);
      alert("Failed to upload images. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-navy mb-4">End Trip & Enter Details</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase text-muted">Total Distance (KM)</label>
              <input
                type="number"
                className="mt-1 w-full rounded-md border border-border p-2 text-sm"
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-muted">Toll Expenses</label>
              <input
                type="number"
                className="mt-1 w-full rounded-md border border-border p-2 text-sm"
                value={toll}
                onChange={(e) => setToll(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-muted">Parking Expenses</label>
              <input
                type="number"
                className="mt-1 w-full rounded-md border border-border p-2 text-sm"
                value={parking}
                onChange={(e) => setParking(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase text-muted">Toll Receipt (Optional)</label>
              <input
                type="file"
                accept="image/*"
                className="mt-1 w-full text-xs text-muted file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue/10 file:text-blue hover:file:bg-blue/20"
                onChange={(e) => setTollImage(e.target.files?.[0] || null)}
              />
              {tollImage && <p className="text-[10px] text-green-600 mt-1">✓ {tollImage.name}</p>}
            </div>

            <div>
              <label className="text-xs font-semibold uppercase text-muted">Parking Receipt (Optional)</label>
              <input
                type="file"
                accept="image/*"
                className="mt-1 w-full text-xs text-muted file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue/10 file:text-blue hover:file:bg-blue/20"
                onChange={(e) => setParkingImage(e.target.files?.[0] || null)}
              />
              {parkingImage && <p className="text-[10px] text-green-600 mt-1">✓ {parkingImage.name}</p>}
            </div>

            {/* Manual End Time Option */}
            <div className="border border-border rounded-md p-3">
              <label className="flex items-center gap-2 cursor-pointer mb-2">
                <input
                  type="checkbox"
                  checked={useManualEndTime}
                  onChange={(e) => setUseManualEndTime(e.target.checked)}
                  className="rounded border-border"
                />
                <span className="text-xs font-semibold uppercase text-muted">Set Manual End Time</span>
              </label>

              {useManualEndTime && (
                <div>
                  <input
                    type="datetime-local"
                    className="w-full rounded-md border border-border p-2 text-sm"
                    value={manualEndTime}
                    onChange={(e) => setManualEndTime(e.target.value)}
                  />
                  <p className="mt-1 text-[10px] text-muted">
                    Leave empty to use current time
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Daily Breakdown Section */}
        <div className="mb-6">
          <button
            type="button"
            onClick={() => setShowDailyBreakdown(!showDailyBreakdown)}
            className="flex items-center gap-2 text-xs font-semibold text-blue hover:text-blue/80 mb-2 transition-colors"
          >
            <span>{showDailyBreakdown ? "Hide" : "Show"} Daily Breakdown</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`transition-transform ${showDailyBreakdown ? "rotate-180" : ""}`}
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>

          {showDailyBreakdown && (
            <div className="border border-border rounded-lg overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="bg-surface/50 px-3 py-2 border-b border-border">
                <h4 className="text-sm font-semibold text-navy">Daily Breakdown</h4>
              </div>
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
                        <select
                          className="w-full rounded border border-border p-1 text-xs"
                          value={log.trip_type}
                          onChange={(e) => updateLog(idx, 'trip_type', e.target.value)}
                        >
                          <option value={TripType.IN_CITY}>In City</option>
                          <option value={TripType.OUT_STATION}>Outstation</option>
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          className="w-full rounded border border-border p-1 text-xs disabled:bg-surface/50"
                          placeholder="Hrs"
                          value={log.hours_used}
                          disabled={log.is_full_day}
                          onChange={(e) => updateLog(idx, 'hours_used', e.target.value)}
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={log.is_full_day}
                          onChange={(e) => {
                            const val = e.target.checked;
                            const newLogs = [...dailyLogs];
                            newLogs[idx] = { ...newLogs[idx], is_full_day: val, hours_used: val ? "0" : newLogs[idx].hours_used };
                            setDailyLogs(newLogs);
                          }}
                          className="rounded border-border"
                          disabled={booking?.package_selected !== 'HOURS_24' && booking?.package_selected !== 'HOURS_10'}
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={log.apply_accommodation}
                          onChange={(e) => updateLog(idx, 'apply_accommodation', e.target.checked)}
                          className="rounded border-border"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {dailyLogs.length === 0 && (
                <div className="p-4 text-center text-xs text-muted">Calculating days...</div>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-border">
          <button onClick={onClose} className="px-4 py-2 text-sm text-muted hover:bg-surface rounded">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={loading || isUploading}
            className="px-4 py-2 text-sm font-semibold text-white bg-blue rounded hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {(loading || isUploading) && (
              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {isUploading ? "Uploading..." : loading ? "Ending..." : "End Trip"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DailyLogsModal({ isOpen, onClose, onSubmit, booking }: { isOpen: boolean; onClose: () => void; onSubmit: (data: any) => void; booking: ChauffeurBooking | null }) {
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

        const endDate = new Date(); // In progress, so until today

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
                    <select
                      className="w-full rounded border border-border p-1 text-xs"
                      value={log.trip_type}
                      onChange={(e) => updateLog(idx, 'trip_type', e.target.value)}
                    >
                      <option value={TripType.IN_CITY}>In City</option>
                      <option value={TripType.OUT_STATION}>Outstation</option>
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      className="w-full rounded border border-border p-1 text-xs disabled:bg-surface/50"
                      placeholder="Hrs"
                      value={log.hours_used}
                      disabled={log.is_full_day}
                      onChange={(e) => updateLog(idx, 'hours_used', e.target.value)}
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={log.is_full_day}
                      onChange={(e) => {
                        const val = e.target.checked;
                        const newLogs = [...dailyLogs];
                        newLogs[idx] = { ...newLogs[idx], is_full_day: val, hours_used: val ? "0" : newLogs[idx].hours_used };
                        setDailyLogs(newLogs);
                      }}
                      className="rounded border-border"
                      disabled={booking?.package_selected !== 'HOURS_24' && booking?.package_selected !== 'HOURS_10'}
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={log.apply_accommodation}
                      onChange={(e) => updateLog(idx, 'apply_accommodation', e.target.checked)}
                      className="rounded border-border"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex gap-3 justify-end pt-4 border-t border-border">
          <button onClick={onClose} className="px-4 py-2 text-sm text-muted hover:bg-surface rounded">Cancel</button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 text-sm font-semibold text-white bg-blue rounded hover:opacity-90"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

// Payment Form Component
function PaymentForm({ bookingId, onSuccess }: { bookingId: number; onSuccess: () => void }) {
  const dispatch = useAppDispatch();
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!amount || parseFloat(amount) <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    setIsSubmitting(true);
    try {
      await dispatch(addPayment({
        bookingId,
        data: {
          amount: parseFloat(amount),
          payment_type: "PARTIAL",
          payment_method: paymentMethod,
          notes: notes || undefined,
        }
      })).unwrap();

      alert("Payment recorded successfully!");
      setAmount("");
      setNotes("");
      onSuccess();
    } catch (error: any) {
      alert("Failed to record payment: " + error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-blue/5 border border-blue/20 rounded-lg p-4">
      <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
        Record Payment
      </h4>
      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-ink block mb-1">
            Amount (PKR) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full h-10 px-3 rounded-md border border-border bg-white text-sm outline-none focus:ring-2 focus:ring-blue/40"
            placeholder="Enter amount"
            required
          />
        </div>

        <div>
          <label className="text-xs font-medium text-ink block mb-1">
            Payment Method
          </label>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="w-full h-10 px-3 rounded-md border border-border bg-white text-sm outline-none focus:ring-2 focus:ring-blue/40"
          >
            <option value="CASH">Cash</option>
            <option value="BANK_TRANSFER">Bank Transfer</option>
            <option value="CARD">Card</option>
            <option value="CHEQUE">Cheque</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-ink block mb-1">
            Notes (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 rounded-md border border-border bg-white text-sm outline-none focus:ring-2 focus:ring-blue/40"
            rows={2}
            placeholder="Add notes about this payment..."
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-10 rounded-md bg-blue px-4 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {isSubmitting ? "Recording..." : "Record Payment"}
        </button>
      </div>
    </form>
  );
}

// Payment Summary Card Component
function PaymentSummaryCard({ summary }: { summary: PaymentSummary | null }) {
  if (!summary) return null;

  const invoiceAmount = parseFloat(summary.invoice_amount);
  const totalPaid = parseFloat(summary.total_paid);
  const remaining = parseFloat(summary.amount_remaining);

  const percentPaid = invoiceAmount > 0 ? (totalPaid / invoiceAmount) * 100 : 0;

  return (
    <div className="bg-gradient-to-br from-green-50 to-blue-50 border border-green-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold text-muted uppercase tracking-wider">
          Payment Status
        </h4>
        <span className={cx(
          "text-[10px] font-bold px-2 py-0.5 rounded-full",
          summary.payment_status === 'FULLY_PAID' ? "bg-green-600/10 text-green-700" :
            summary.payment_status === 'PARTIALLY_PAID' ? "bg-yellow/10 text-yellow" :
              "bg-red-500/10 text-red-600"
        )}>
          {summary.payment_status.replace(/_/g, " ")}
        </span>
      </div>

      <div className="space-y-2 mb-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted">Invoice Total:</span>
          <span className="font-bold text-ink">PKR {invoiceAmount.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted">Amount Paid:</span>
          <span className="font-semibold text-green-600">PKR {totalPaid.toLocaleString()}</span>
        </div>
        <div className="h-px bg-border my-2"></div>
        <div className="flex justify-between text-sm">
          <span className="font-semibold text-ink">Balance Due:</span>
          <span className="font-bold text-lg text-orange">
            PKR {remaining.toLocaleString()}
          </span>
        </div>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <div
          className="bg-gradient-to-r from-green-500 to-blue-500 h-full transition-all duration-500"
          style={{ width: `${Math.min(percentPaid, 100)}%` }}
        />
      </div>
      <div className="text-right text-[10px] text-muted mt-1">
        {percentPaid.toFixed(1)}% paid
      </div>
    </div>
  );
}

// Payment History List Component
function PaymentHistoryList({ payments }: { payments: PaymentTransaction[] }) {
  if (!payments || payments.length === 0) {
    return (
      <div className="text-center py-6 text-sm text-muted">
        No payments recorded yet
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
        Payment History ({payments.length})
      </h4>
      <div className="max-h-64 overflow-y-auto space-y-2">
        {payments.map((payment) => (
          <div
            key={payment.id}
            className="flex items-center justify-between bg-surface/30 p-3 rounded-md border border-border"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-ink">
                  PKR {parseFloat(payment.amount).toLocaleString()}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue/10 text-blue font-medium">
                  {payment.payment_method || "N/A"}
                </span>
              </div>
              <div className="text-[11px] text-muted mt-0.5">
                {new Date(payment.payment_date).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                })}
                {payment.users_received_by && (
                  <span> • By: {payment.users_received_by.full_name}</span>
                )}
              </div>
              {payment.notes && (
                <div className="text-xs text-muted italic mt-1">
                  {payment.notes}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function BookingsPage() {
  const dispatch = useAppDispatch();
  const bookings = useAppSelector(selectAdminBookings);
  const status = useAppSelector(selectAdminBookingsStatus);
  const pagination = useAppSelector(selectAdminBookingsPagination);
  const availableCars = useAppSelector(selectAvailableVehicles);
  const availableDrivers = useAppSelector(selectAvailableDrivers);
  const paymentHistory = useAppSelector(selectPaymentHistory);
  const paymentSummary = useAppSelector(selectPaymentSummary);

  const [isLoading, setIsLoading] = useState(true); // Local loading state for initial load or debounce
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);
  const [selectedCarId, setSelectedCarId] = useState<string>("");
  const [selectedDriverId, setSelectedDriverId] = useState<string>("");
  const [showEndTripModal, setShowEndTripModal] = useState(false);
  const [showDailyLogsModal, setShowDailyLogsModal] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isStartingTrip, setIsStartingTrip] = useState(false);
  const [isEndingTrip, setIsEndingTrip] = useState(false);

  // Auto-fill driver when a vehicle is selected
  useEffect(() => {
    if (selectedCarId) {
      const carId = parseInt(selectedCarId);
      const assignedDriver = availableDrivers.find(d => d.drivers_profile?.current_vehicle_id === carId);
      if (assignedDriver) {
        setSelectedDriverId(assignedDriver.id);
      }
    }
  }, [selectedCarId, availableDrivers]);

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const limit = 10;

  useEffect(() => {
    // Sync loading state with Redux if needed, or just use Redux status directly
    setIsLoading(status === 'loading');
  }, [status]);

  const loadData = () => {
    dispatch(fetchAdminBookings({
      status: statusFilter || undefined,
      search: searchQuery || undefined,
      page: currentPage,
      limit
    }));
  };

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentPage !== 1) {
        setCurrentPage(1);
      } else {
        loadData();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, statusFilter]);

  // Fetch when page changes
  useEffect(() => {
    loadData();
  }, [currentPage]);

  // Load payment data for a booking
  const loadPaymentData = (bookingId: number) => {
    dispatch(fetchPaymentHistory(bookingId));
    dispatch(fetchPaymentSummary(bookingId));
  };

  // Handle opening modal and fetching resources
  const onOpenBookingModal = (booking: ChauffeurBooking) => {
    setSelectedBookingId(booking.id);
    setSelectedCarId("");
    setSelectedDriverId("");

    // Only fetch resources if the booking needs assignment (PENDING status)
    if (booking.status === 'PENDING') {
      // Check if resources are already loaded to avoid redundant calls or force refresh if needed
      // Currently forcing refresh to ensure availability is up to date
      dispatch(fetchAvailableVehicles({ limit: 100 }));
      dispatch(fetchAvailableDrivers({ limit: 100, driver_type: DriverType.CHAUFFEUR }));
    }

    // Load payment data for non-pending bookings
    if (booking.status !== 'PENDING') {
      loadPaymentData(booking.id);
    }
  };

  const selectedBooking = useMemo(() => {
    if (!selectedBookingId) return null;
    return bookings.find((b) => b.id === selectedBookingId) ?? null;
  }, [bookings, selectedBookingId]);

  async function handleApprove() {
    if (!selectedBooking || !selectedCarId || !selectedDriverId) {
      alert("Please select both a vehicle and a driver to assign");
      return;
    }

    setIsApproving(true);
    try {
      await dispatch(assignBooking({
        bookingId: selectedBooking.id,
        vehicleId: parseInt(selectedCarId),
        driverId: selectedDriverId
      })).unwrap();

      alert("Booking approved and assignment complete!");
      setSelectedBookingId(null);
      setSelectedCarId("");
      setSelectedDriverId("");

      loadData();
      // Refresh resources if needed? Usually not strictly necessary unless availability changed drastically
    } catch (error: any) {
      console.error("Failed to approve booking", error);
      alert(error || "Failed to approve booking");
    } finally {
      setIsApproving(false);
    }
  }

  async function handleStartTrip() {
    if (!selectedBooking) return;
    if (!confirm("Are you sure you want to START this trip?")) return;

    setIsStartingTrip(true);
    try {
      await dispatch(startTrip(selectedBooking.id)).unwrap();
      alert("Trip started successfully!");
      setSelectedBookingId(null);
      loadData();
    } catch (error: any) {
      alert(error || "Failed to start trip");
    } finally {
      setIsStartingTrip(false);
    }
  }

  async function handleEndTrip(data: any) {
    if (!selectedBooking) return;

    setIsEndingTrip(true);
    try {
      await dispatch(endTrip({ id: selectedBooking.id, data })).unwrap();
      alert("Trip completed and invoice generated successfully!");
      setShowEndTripModal(false);
      setSelectedBookingId(null);
      loadData();
    } catch (error: any) {
      alert(error || "Failed to end trip");
    } finally {
      setIsEndingTrip(false);
    }
  }

  async function handleUpdateDailyLogs(data: any) {
    if (!selectedBooking) return;

    try {
      await dispatch(updateDailyLogs({ id: selectedBooking.id, data })).unwrap();
      alert("Daily logs updated successfully!");
      setShowDailyLogsModal(false);
      loadData();
    } catch (error: any) {
      alert(error || "Failed to update daily logs");
    }
  }

  async function handleCompleteTrip() {
    if (!selectedBooking) return;
    if (!confirm("Are you sure you want to COMPLETE this trip? Financials will be calculated.")) return;

    try {
      const res: any = await dispatch(completeTrip(selectedBooking.id)).unwrap();
      // res.result might contain invoice_amount
      alert(`Trip completed! Invoice Amount: ${res.result?.invoice_amount ?? 'Calculated'}`);
      setSelectedBookingId(null);
      loadData();
    } catch (error: any) {
      alert("Failed to complete trip: " + error);
    }
  }

  async function handleReject() {
    if (!selectedBooking) return;
    if (!confirm("Are you sure you want to REJECT this booking?")) return;

    try {
      await dispatch(updateBookingStatus({ id: selectedBooking.id, status: "CANCELLED" })).unwrap();
      alert("Booking rejected.");
      setSelectedBookingId(null);
      loadData();
    } catch (error: any) {
      alert(error || "Failed to reject booking");
    }
  }

  async function handleGenerateInvoice(id: number) {
    if (!confirm("Generate invoice for this trip?")) return;
    try {
      await dispatch(generateTripInvoice(id)).unwrap();
      alert("Invoice generated successfully");
      loadData();
    } catch (e: any) {
      alert("Failed to generate invoice: " + e);
    }
  }

  const handleStatusChange = async (b: ChauffeurBooking, newStatus: string) => {
    // 1. BLOCK "ASSIGNED" manual selection
    if (newStatus === 'ASSIGNED') {
      alert("⚠️ Cannot manually switch to 'ASSIGNED'.\n\nPlease click on the booking row to open the details modal, then select a vehicle and driver to Assign.");
      // Force UI refresh or just return to prevent API call
      // Since select value is controlled by `b.status` (from props/redux), we just return. 
      // The UI might momentarily show the new value until next render, but since we don't dispatch, it reverts or stays.
      // To strictly revert visual change immediately if local state wasn't used: 
      // In this component, `value={b.status}` comes from Redux store `bookings` array. 
      // Since we don't update Redux, it will snap back on next render/store update or stay as is.
      // However, React controlled inputs with creating a change event might be tricky if not updated.
      // Easiest is to just return. The user will see it didn't change (or it snaps back).
      loadData(); // Re-fetch to ensure UI sync
      return;
    }

    // 2. Trip Flow Triggers
    if (newStatus === 'IN_PROGRESS') {
      if (!confirm("Start this trip? This will create a trip log.")) return;
      try {
        await dispatch(startTrip(b.id)).unwrap();
        loadData();
      } catch (e: any) { alert("Failed: " + e); }
      return;
    }

    if (newStatus === 'ENDED') {
      setSelectedBookingId(b.id);
      setShowEndTripModal(true);
      return;
    }

    if (newStatus === 'COMPLETED') {
      if (b.status !== 'ENDED') {
        alert("⚠️ Trip must be in status 'ENDED' before it can be 'COMPLETED'.\n\nPlease select 'ENDED' first to enter trip details (mileage, tolls, etc.).");
        loadData();
        return;
      }
      if (!confirm("Complete this trip? This will calculate financials and generate the invoice.")) return;
      try {
        await dispatch(completeTrip(b.id)).unwrap();
        loadData();
      } catch (e: any) { alert("Failed: " + e); }
      return;
    }

    // 3. WARN for CANCELLED (Potentially unsafe/missing email)
    if (newStatus === 'CANCELLED') {
      if (!confirm("⚠️ Are you sure you want to CANCEL this booking?\n\nNote: This action only updates the status and does NOT currently send a cancellation email to the customer.")) return;
      try {
        await dispatch(updateBookingStatus({ id: b.id, status: newStatus })).unwrap();
        loadData();
      } catch (e: any) { alert("Failed: " + e); }
      return;
    }

    // 4. Default for ARRIVED or others
    const confirmMessage = newStatus === 'ARRIVED'
      ? "Mark driver as ARRIVED at pickup location?"
      : `Change status to ${newStatus}?`;

    if (!confirm(confirmMessage)) return;
    try {
      await dispatch(updateBookingStatus({ id: b.id, status: newStatus })).unwrap();
      loadData();
    } catch (e: any) { alert("Failed: " + e); }
  }

  return (
    <div className="flex flex-col gap-6">
      <EndTripModal
        isOpen={showEndTripModal}
        onClose={() => setShowEndTripModal(false)}
        onSubmit={handleEndTrip}
        booking={selectedBooking}
        loading={isEndingTrip}
      />
      <DailyLogsModal
        isOpen={showDailyLogsModal}
        onClose={() => setShowDailyLogsModal(false)}
        onSubmit={handleUpdateDailyLogs}
        booking={selectedBooking}
      />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-muted">Bookings Management</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-navy">
            All Bookings
          </h1>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 bg-white p-4 rounded-xl border border-border shadow-sm">
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs font-semibold text-muted uppercase mb-1 block">Search</label>
          <input
            type="text"
            placeholder="Search passenger, company, vehicle..."
            className="w-full h-10 px-3 rounded-md border border-border bg-surface/50 text-sm focus:outline-none focus:ring-2 focus:ring-blue/20"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="w-[200px]">
          <label className="text-xs font-semibold text-muted uppercase mb-1 block">Status</label>
          <select
            className="w-full h-10 px-3 rounded-md border border-border bg-surface/50 text-sm focus:outline-none focus:ring-2 focus:ring-blue/20"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="ARRIVED">Arrived</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="ENDED">Ended</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <section className="rounded-xl border border-border bg-white overflow-hidden shadow-sm">
          <div className="p-4 border-b border-border bg-surface/30">
            <div className="text-sm font-semibold text-navy">Booking List</div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-surface text-xs font-semibold tracking-wider text-muted">
                <tr>
                  <th className="px-4 py-3 text-left">Company</th>
                  <th className="px-4 py-3 text-left">Passenger</th>
                  <th className="px-4 py-3 text-left">Request</th>
                  <th className="px-4 py-3 text-left">City</th>
                  <th className="px-4 py-3 text-left">Pickup Address</th>
                  <th className="px-4 py-3 text-left">Assigned Driver</th>
                  <th className="px-4 py-3 text-left">Assigned Vehicle</th>
                  <th className="px-4 py-3 text-left">Scheduled At</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading && bookings.length === 0 ? (
                  <tr><td colSpan={9} className="p-4 text-center">Loading...</td></tr>
                ) : bookings.map((b) => {
                  const isSelected = selectedBookingId === b.id;
                  const driver = b.users_chauffeur_bookings_driver_idTousers;
                  const vehicle = b.vehicles;

                  return (
                    <tr
                      key={b.id}
                      onClick={() => onOpenBookingModal(b)}
                      className={cx(
                        "cursor-pointer transition-colors group",
                        isSelected ? "bg-blue/5" : "hover:bg-surface",
                      )}
                    >
                      <td className="px-4 py-4">
                        <div className="font-semibold text-ink group-hover:text-blue transition-colors">
                          {b.companies?.name || "Unknown Company"}
                        </div>
                        <div className="text-[10px] text-muted font-mono">{b.id}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-ink">{b.users_chauffeur_bookings_passenger_idTousers?.full_name || "Unknown Passenger"}</div>
                        <div className="text-[11px] text-muted">
                          {b.users_chauffeur_bookings_passenger_idTousers?.email}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-ink font-medium">{b.vehicle_model || "Any Model"}</div>
                        <div className="text-[11px] text-muted">{b.package_selected.replace(/_/g, " ")}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm font-medium text-ink">{b.city || "—"}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="max-w-[150px] truncate text-sm text-ink" title={b.pickup_address || "No address"}>
                          {b.pickup_address || "-"}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {driver ? (
                          <div>
                            <div className="text-sm font-medium text-ink">{driver.full_name}</div>
                            {driver.phone && (
                              <div className="text-[11px] text-muted mt-0.5">{driver.phone}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted text-xs italic">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {vehicle ? (
                          <div>
                            <div className="text-sm font-medium text-ink">{vehicle.model}</div>
                            <div className="text-[11px] text-muted font-mono mt-0.5">{vehicle.plate_number}</div>
                          </div>
                        ) : (
                          <span className="text-muted text-xs italic">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-muted">
                        {formatDateTime(b.scheduled_for)}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <div onClick={(e) => e.stopPropagation()}>
                          <select
                            value={b.status}
                            onChange={(e) => handleStatusChange(b, e.target.value)}
                            className={cx(
                              "h-7 rounded-full px-2 text-[11px] font-semibold border-none outline-none cursor-pointer appearance-none text-center min-w-[100px]",
                              b.status === 'PENDING' ? "bg-yellow/10 text-yellow" :
                                b.status === 'COMPLETED' ? "bg-green/10 text-green-600" :
                                  b.status === 'CANCELLED' ? "bg-red/10 text-red-600" :
                                    "bg-blue/10 text-blue"
                            )}
                          >
                            <option value="PENDING">PENDING</option>
                            <option value="ASSIGNED">ASSIGNED</option>
                            <option value="ARRIVED">ARRIVED</option>
                            <option value="IN_PROGRESS">IN_PROGRESS</option>
                            <option value="ENDED">ENDED</option>
                            <option value="COMPLETED">COMPLETED</option>
                            <option value="CANCELLED">CANCELLED</option>
                          </select>
                        </div>
                        {b.status === 'COMPLETED' && !b.invoices && (
                          <div className="mt-2 text-center" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleGenerateInvoice(b.id)}
                              className="text-[10px] bg-navy text-white px-2 py-1 rounded hover:opacity-90"
                            >
                              Generate Invoice
                            </button>
                          </div>
                        )}
                        {b.invoices && (
                          <div className="mt-2 text-center text-[10px] text-green-600 font-medium">
                            Invoiced #{b.invoices.invoice_number}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!isLoading && bookings.length === 0 ? (
              <div className="py-12 text-center">
                <div className="text-sm text-muted">No bookings found matching criteria.</div>
              </div>
            ) : null}
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={pagination.pages}
            onPageChange={(page) => setCurrentPage(page)}
          />
        </section>

        {selectedBooking && (
          <Modal
            isOpen={!!selectedBooking}
            onClose={() => setSelectedBookingId(null)}
            title={`Booking Details #${selectedBooking.id}`}
          >
            <div className="flex flex-col gap-6">
              {/* Status Header */}
              <div className="flex items-center justify-between bg-surface p-4 rounded-lg border border-border">
                <div>
                  <div className="text-xs text-muted uppercase tracking-wider font-semibold">Current Status</div>
                  <div className={cx(
                    "mt-1 text-sm font-bold px-2 py-0.5 rounded-full inline-block",
                    selectedBooking.status === 'PENDING' ? "bg-yellow/10 text-yellow" :
                      selectedBooking.status === 'COMPLETED' ? "bg-green/10 text-green-600" :
                        selectedBooking.status === 'CANCELLED' ? "bg-red/10 text-red-600" :
                          "bg-blue/10 text-blue"
                  )}>
                    {selectedBooking.status}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted uppercase tracking-wider font-semibold">Scheduled For</div>
                  <div className="mt-1 text-sm font-medium text-ink">{formatDateTime(selectedBooking.scheduled_for)}</div>
                </div>
              </div>

              <div className="space-y-6">
                {/* Trip & Vehicle Request */}
                <div>
                  <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3 border-b border-border pb-1">Trip Details</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-[10px] text-muted uppercase">Trip Type</div>
                      <div className="text-sm font-medium text-ink">{selectedBooking.trip_type.replace(/_/g, " ")}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted uppercase">Package</div>
                      <div className="text-sm font-medium text-ink">{selectedBooking.package_selected.replace(/_/g, " ")}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted uppercase">Requested Model</div>
                      <div className="text-sm font-medium text-ink">{selectedBooking.vehicle_model || "Any"}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted uppercase">City</div>
                      <div className="text-sm font-medium text-ink">{selectedBooking.city || "—"}</div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-[10px] text-muted uppercase">Pickup Address</div>
                      <div className="text-sm font-medium text-ink">{selectedBooking.pickup_address || "—"}</div>
                    </div>
                  </div>
                </div>

                {/* Passenger Info */}
                <div>
                  <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3 border-b border-border pb-1">Passenger & Company</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-[10px] text-muted uppercase">Passenger Name</div>
                      <div className="text-sm font-medium text-ink">{selectedBooking.users_chauffeur_bookings_passenger_idTousers?.full_name || "—"}</div>
                      {selectedBooking.users_chauffeur_bookings_passenger_idTousers?.email && (
                        <div className="text-xs text-muted">{selectedBooking.users_chauffeur_bookings_passenger_idTousers.email}</div>
                      )}
                    </div>
                    <div>
                      <div className="text-[10px] text-muted uppercase">Company</div>
                      <div className="text-sm font-medium text-ink">{selectedBooking.companies?.name || "—"}</div>
                    </div>
                  </div>
                </div>

                {/* Assignment Details (if active) */}
                {selectedBooking.status !== 'PENDING' && (
                  <div>
                    <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3 border-b border-border pb-1">Assignment Details</h4>
                    <div className="grid grid-cols-2 gap-4 bg-surface/30 p-3 rounded-md">
                      <div>
                        <div className="text-[10px] text-muted uppercase">Assigned Driver</div>
                        <div className="text-sm font-medium text-ink mt-0.5">
                          {selectedBooking.users_chauffeur_bookings_driver_idTousers?.full_name || "—"}
                        </div>
                        {selectedBooking.users_chauffeur_bookings_driver_idTousers?.phone && (
                          <div className="text-xs text-muted">{selectedBooking.users_chauffeur_bookings_driver_idTousers.phone}</div>
                        )}
                      </div>
                      <div>
                        <div className="text-[10px] text-muted uppercase">Assigned Vehicle</div>
                        <div className="text-sm font-medium text-ink mt-0.5">
                          {selectedBooking.vehicles ? selectedBooking.vehicles.model : "—"}
                        </div>
                        {selectedBooking.vehicles && (
                          <div className="text-xs font-mono text-muted">{selectedBooking.vehicles.plate_number}</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Daily Breakdown (Transparency) */}
                {selectedBooking.chauffeur_trip_daily_logs && selectedBooking.chauffeur_trip_daily_logs.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3 border-b border-border pb-1">Trip Breakdown</h4>
                    <div className="border border-border rounded-lg overflow-hidden bg-white shadow-sm">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-surface font-bold text-muted uppercase tracking-tight">
                          <tr>
                            <th className="px-3 py-2 border-b border-border">Date</th>
                            <th className="px-3 py-2 border-b border-border">Type</th>
                            <th className="px-3 py-2 border-b border-border text-center">Hours</th>
                            <th className="px-3 py-2 border-b border-border text-center">Full Day</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {[...selectedBooking.chauffeur_trip_daily_logs].sort((a, b) => new Date(a.log_date).getTime() - new Date(b.log_date).getTime()).map((log) => (
                            <tr key={log.id} className="hover:bg-surface/50 transition-colors">
                              <td className="px-3 py-2 font-medium text-ink">
                                {new Date(log.log_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' })}
                              </td>
                              <td className="px-3 py-2 text-muted">
                                {log.trip_type === 'OUT_STATION' ? (
                                  <span className="text-orange font-semibold">Outstation</span>
                                ) : (
                                  <span className="text-blue/80">In City</span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-center font-mono text-ink">
                                {log.hours_used ? parseFloat(log.hours_used.toString()).toFixed(1) : (log.is_full_day ? "24.0" : "0.0")}
                              </td>
                              <td className="px-3 py-2 text-center">
                                {log.is_full_day ? (
                                  <span className="text-green-600 text-[10px] font-bold">YES</span>
                                ) : (
                                  <span className="text-muted text-[10px]">NO</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {selectedBooking.status === 'PENDING' && (
                <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
                  <div className="text-xs font-semibold tracking-wider text-muted">
                    ASSIGN DRIVER & VEHICLE
                  </div>
                  <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    <label className="flex flex-col gap-1">
                      <span className="text-sm font-medium text-ink">Select Vehicle</span>
                      <select
                        value={selectedCarId}
                        onChange={(e) => setSelectedCarId(e.target.value)}
                        className="h-10 rounded-md border border-border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue/40"
                      >
                        <option value="">Select a vehicle</option>
                        {availableCars.map((car) => (
                          <option key={car.id} value={car.id}>
                            {car.make} {car.model} ({car.plate_number})
                          </option>
                        ))}
                      </select>
                      {availableCars.length === 0 && (
                        <div className="mt-1 text-xs text-muted">No available vehicles found.</div>
                      )}
                    </label>

                    <label className="flex flex-col gap-1">
                      <span className="text-sm font-medium text-ink">Select Driver</span>
                      <select
                        value={selectedDriverId}
                        onChange={(e) => setSelectedDriverId(e.target.value)}
                        className="h-10 rounded-md border border-border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue/40"
                      >
                        <option value="">Select a driver</option>
                        {availableDrivers.map((driver) => (
                          <option key={driver.id} value={driver.id}>
                            {driver.full_name} ({driver.email})
                          </option>
                        ))}
                      </select>
                      {availableDrivers.length === 0 && (
                        <div className="mt-1 text-xs text-muted">No available drivers found.</div>
                      )}
                    </label>
                  </div>
                </div>
              )}

              {selectedBooking.status === 'PENDING' && (
                <div className="flex items-center gap-3 justify-end pt-4 border-t border-border">
                  <button
                    type="button"
                    onClick={handleReject}
                    className="inline-flex h-10 items-center justify-center rounded-md border border-danger/30 bg-white px-4 text-sm font-semibold text-danger hover:bg-danger/5"
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    onClick={handleApprove}
                    disabled={!selectedCarId || !selectedDriverId || isApproving}
                    className="inline-flex h-10 items-center justify-center rounded-md bg-orange px-4 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50 gap-2"
                  >
                    {isApproving && (
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    )}
                    {isApproving ? "Approving..." : "Approve & Assign"}
                  </button>
                </div>
              )}


              {/* Payment Tracking Section - Only show for active/completed trips */}
              {selectedBooking.status !== 'PENDING' && selectedBooking.status !== 'CANCELLED' && (
                <div className="space-y-4 mt-6">
                  <h4 className="text-xs font-semibold text-muted uppercase tracking-wider border-b border-border pb-1">
                    Payment Tracking
                  </h4>

                  {/* Show summary if trip is completed */}
                  {selectedBooking.status === 'COMPLETED' && paymentSummary && (
                    <PaymentSummaryCard summary={paymentSummary} />
                  )}

                  {/* Payment form - show for IN_PROGRESS, ENDED, or COMPLETED trips, but hide if fully paid */}
                  {(selectedBooking.status === 'IN_PROGRESS' ||
                    selectedBooking.status === 'ENDED' ||
                    selectedBooking.status === 'COMPLETED') &&
                    paymentSummary?.payment_status !== 'FULLY_PAID' && (
                      <PaymentForm
                        bookingId={selectedBooking.id}
                        onSuccess={() => loadPaymentData(selectedBooking.id)}
                      />
                    )}

                  {/* Payment history */}
                  {paymentHistory.length > 0 && (
                    <PaymentHistoryList payments={paymentHistory} />
                  )}
                </div>
              )}

              {(selectedBooking.status === 'ASSIGNED' || selectedBooking.status === 'ARRIVED') && (
                <div className="flex items-center gap-3 justify-end pt-4 border-t border-border">
                  <button
                    type="button"
                    onClick={handleStartTrip}
                    disabled={isStartingTrip}
                    className="inline-flex h-10 items-center justify-center rounded-md bg-blue px-4 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50 gap-2"
                  >
                    {isStartingTrip && (
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    )}
                    {isStartingTrip ? "Starting..." : "Start Trip"}
                  </button>
                </div>
              )}

              {selectedBooking.status === 'IN_PROGRESS' && (
                <div className="flex items-center gap-3 justify-end pt-4 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setShowEndTripModal(true)}
                    className="inline-flex h-10 items-center justify-center rounded-md bg-navy px-4 text-sm font-semibold text-white hover:opacity-95"
                  >
                    End Trip
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDailyLogsModal(true)}
                    className="inline-flex h-10 items-center justify-center rounded-md bg-blue/10 text-blue px-4 text-sm font-semibold hover:bg-blue/20"
                  >
                    Manage Daily Logs
                  </button>
                </div>
              )}

              {selectedBooking.status === 'ENDED' && (
                <div className="flex items-center gap-3 justify-end pt-4 border-t border-border">
                  <button
                    type="button"
                    onClick={handleCompleteTrip}
                    className="inline-flex h-10 items-center justify-center rounded-md bg-green-600 px-4 text-sm font-semibold text-white hover:opacity-95"
                  >
                    Complete Trip (Generate Invoice)
                  </button>
                </div>
              )}
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
}
