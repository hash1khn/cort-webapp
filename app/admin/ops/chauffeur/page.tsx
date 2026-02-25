// "use client";

// import { useEffect, useMemo, useState } from "react";
// import { makeNewChauffeurBooking, useAdminStore } from "../../store/AdminStore";
// import type { ChauffeurBooking, ChauffeurCar } from "../../store/types";
// import Map, { type MapMarker } from "../../ui/Map";

// function cx(...classes: Array<string | false | null | undefined>) {
//   return classes.filter(Boolean).join(" ");
// }

// export default function OpsChauffeurPage() {
//   const { db, upsertChauffeurCar, upsertChauffeurBooking } = useAdminStore();

//   const [filter, setFilter] = useState<"all" | "available" | "in_trip" | "offline">("all");
//   const [companyId, setCompanyId] = useState<string>(db.companies[0]?.id ?? "");

//   const company = useMemo(() => db.companies.find((c) => c.id === companyId) ?? null, [db.companies, companyId]);
//   const employees = company?.employees ?? [];
//   const [passengerId, setPassengerId] = useState<string>(employees[0]?.id ?? "");
//   const allowedModels = company?.allowed_vehicle_models ?? [];
//   const [vehicleModel, setVehicleModel] = useState<string>(allowedModels[0] ?? "");
//   const [tripType, setTripType] = useState<ChauffeurBooking["trip_type"]>("in_city");
//   const [pkg, setPkg] = useState<ChauffeurBooking["package"]>("10hr");
//   const [scheduledAt, setScheduledAt] = useState<string>(() => new Date().toISOString().slice(0, 16));

//   const cars = useMemo(() => {
//     if (filter === "all") return db.chauffeur_cars;
//     return db.chauffeur_cars.filter((c) => c.status === filter);
//   }, [db.chauffeur_cars, filter]);

//   const recentBookings = db.chauffeur_bookings.slice(0, 10);

//   useEffect(() => {
//     // Keep dependent form fields valid when switching company.
//     setPassengerId((prev) => {
//       if (!company) return "";
//       if (company.employees.some((e) => e.id === prev)) return prev;
//       return company.employees[0]?.id ?? "";
//     });
//     setVehicleModel((prev) => {
//       if (!company) return "";
//       if (company.allowed_vehicle_models.includes(prev)) return prev;
//       return company.allowed_vehicle_models[0] ?? "";
//     });
//   }, [company]);

//   function toIsoLocal(datetimeLocal: string) {
//     // datetime-local has no timezone; interpret as local time.
//     const d = new Date(datetimeLocal);
//     return d.toISOString();
//   }

//   function badge(status: ChauffeurCar["status"]) {
//     if (status === "available") return "bg-success/10 text-success";
//     if (status === "in_trip") return "bg-orange/10 text-orange";
//     return "bg-muted/10 text-muted";
//   }

//   return (
//     <div className="flex flex-col gap-6">
//       <div>
//         <div className="text-sm font-medium text-muted">Operations: Chauffeur</div>
//         <h1 className="mt-1 text-2xl font-semibold tracking-tight text-navy">Dispatch</h1>
//       </div>

//       <div className="grid gap-6 lg:grid-cols-2">
//         <div className="flex flex-col gap-6">
//           <div className="rounded-xl border border-border bg-white p-6">
//             <div className="mb-4">
//               <div className="text-xs font-semibold tracking-wider text-muted">GOD-VIEW MAP</div>
//               <div className="mt-1 text-sm text-muted">
//                 Real-time view of all active Chauffeur cars. Filter by status below.
//               </div>
//             </div>
//             <Map
//               height="400px"
//               markers={cars
//                 .filter((c) => c.lat !== undefined && c.lng !== undefined)
//                 .map((c) => ({
//                   id: c.id,
//                   position: [c.lat!, c.lng!],
//                   label: `${c.driver_name} - ${c.model} (${c.plate_no}) - ${c.status}`,
//                   color: c.status === "available" ? "#388e3c" : c.status === "in_trip" ? "#f47f00" : "#666",
//                 }))}
//             />
//           </div>

//           <div className="rounded-xl border border-border bg-white p-6">
//             <div className="flex flex-wrap items-center justify-between gap-3">
//               <div>
//                 <div className="text-xs font-semibold tracking-wider text-muted">CAR LIST</div>
//                 <div className="mt-1 text-sm text-muted">
//                   Live car list + status toggle. Cars with coordinates appear on map above.
//                 </div>
//               </div>
//               <select
//                 value={filter}
//                 onChange={(e) => setFilter(e.target.value as typeof filter)}
//                 className="h-10 rounded-md border border-border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue/40"
//               >
//                 <option value="all">All</option>
//                 <option value="available">Available</option>
//                 <option value="in_trip">In-Trip</option>
//                 <option value="offline">Offline</option>
//               </select>
//             </div>

//           <div className="mt-4 overflow-x-auto rounded-lg border border-border">
//             <table className="min-w-full text-sm">
//               <thead className="bg-surface text-xs font-semibold tracking-wider text-muted">
//                 <tr>
//                   <th className="px-3 py-2 text-left">Driver</th>
//                   <th className="px-3 py-2 text-left">Car</th>
//                   <th className="px-3 py-2 text-left">Status</th>
//                   <th className="px-3 py-2 text-right">Action</th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-border bg-white">
//                 {cars.map((c) => (
//                   <tr key={c.id}>
//                     <td className="px-3 py-2">
//                       <div className="font-semibold text-ink">{c.driver_name}</div>
//                       <div className="text-xs text-muted">Car_ID: {c.id}</div>
//                     </td>
//                     <td className="px-3 py-2">
//                       <div className="text-sm text-ink">{c.model}</div>
//                       <div className="text-xs text-muted">{c.plate_no}</div>
//                     </td>
//                     <td className="px-3 py-2">
//                       <span className={cx("rounded-full px-2 py-0.5 text-xs font-semibold", badge(c.status))}>
//                         {c.status}
//                       </span>
//                     </td>
//                     <td className="px-3 py-2 text-right">
//                       <select
//                         value={c.status}
//                         onChange={(e) =>
//                           upsertChauffeurCar({ ...c, status: e.target.value as ChauffeurCar["status"] })
//                         }
//                         className="h-9 rounded-md border border-border bg-white px-2 text-sm outline-none focus:ring-2 focus:ring-blue/40"
//                       >
//                         <option value="available">available</option>
//                         <option value="in_trip">in_trip</option>
//                         <option value="offline">offline</option>
//                       </select>
//                     </td>
//                   </tr>
//                 ))}
//                 {cars.length === 0 ? (
//                   <tr>
//                     <td className="px-3 py-8 text-center text-sm text-muted" colSpan={4}>
//                       No cars match this filter.
//                     </td>
//                   </tr>
//                 ) : null}
//               </tbody>
//             </table>
//           </div>
//           </div>
//         </div>

//         <div className="rounded-xl border border-border bg-white p-6">
//           <div className="text-xs font-semibold tracking-wider text-muted">MANUAL BOOKING (OVERRIDE)</div>
//           <div className="mt-1 text-sm text-muted">
//             Create a booking on behalf of a company (mock). Status starts at “searching”.
//           </div>

//           <div className="mt-4 grid gap-3 sm:grid-cols-2">
//             <label className="flex flex-col gap-1 sm:col-span-2">
//               <span className="text-sm font-medium text-ink">Company</span>
//               <select
//                 value={companyId}
//                 onChange={(e) => setCompanyId(e.target.value)}
//                 className="h-10 rounded-md border border-border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue/40"
//               >
//                 {db.companies
//                   .filter((c) => c.services_enabled.chauffeur_enabled)
//                   .map((c) => (
//                     <option key={c.id} value={c.id}>
//                       {c.name}
//                     </option>
//                   ))}
//               </select>
//             </label>

//             <label className="flex flex-col gap-1 sm:col-span-2">
//               <span className="text-sm font-medium text-ink">Passenger (Employee)</span>
//               <select
//                 value={passengerId}
//                 onChange={(e) => setPassengerId(e.target.value)}
//                 className="h-10 rounded-md border border-border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue/40"
//               >
//                 {employees.map((e) => (
//                   <option key={e.id} value={e.id}>
//                     {e.full_name} ({e.employee_id || "—"})
//                   </option>
//                 ))}
//               </select>
//               {employees.length === 0 ? (
//                 <div className="mt-1 text-xs text-danger">
//                   This company has no employees. Import employees in Companies first.
//                 </div>
//               ) : null}
//             </label>

//             <label className="flex flex-col gap-1 sm:col-span-2">
//               <span className="text-sm font-medium text-ink">Requested Vehicle Model (Whitelist)</span>
//               <select
//                 value={vehicleModel}
//                 onChange={(e) => setVehicleModel(e.target.value)}
//                 className="h-10 rounded-md border border-border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue/40"
//               >
//                 {allowedModels.map((m) => (
//                   <option key={m} value={m}>
//                     {m}
//                   </option>
//                 ))}
//               </select>
//               {allowedModels.length === 0 ? (
//                 <div className="mt-1 text-xs text-danger">
//                   No whitelisted vehicles. Set allowed models in Companies first.
//                 </div>
//               ) : null}
//             </label>

//             <label className="flex flex-col gap-1">
//               <span className="text-sm font-medium text-ink">Trip Type</span>
//               <select
//                 value={tripType}
//                 onChange={(e) => setTripType(e.target.value as ChauffeurBooking["trip_type"])}
//                 className="h-10 rounded-md border border-border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue/40"
//               >
//                 <option value="in_city">In-City</option>
//                 <option value="out_station">Out-Station</option>
//               </select>
//             </label>

//             <label className="flex flex-col gap-1">
//               <span className="text-sm font-medium text-ink">Package</span>
//               <select
//                 value={pkg}
//                 onChange={(e) => setPkg(e.target.value as ChauffeurBooking["package"])}
//                 className="h-10 rounded-md border border-border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue/40"
//               >
//                 <option value="5hr">5hr</option>
//                 <option value="10hr">10hr</option>
//                 <option value="24hr">24hr</option>
//                 <option value="monthly_10hr">Monthly (10hr)</option>
//                 <option value="monthly_24hr">Monthly (24hr)</option>
//               </select>
//             </label>

//             <label className="flex flex-col gap-1 sm:col-span-2">
//               <span className="text-sm font-medium text-ink">Schedule</span>
//               <input
//                 type="datetime-local"
//                 value={scheduledAt}
//                 onChange={(e) => setScheduledAt(e.target.value)}
//                 className="h-10 rounded-md border border-border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue/40"
//               />
//             </label>
//           </div>

//           <button
//             type="button"
//             disabled={!company || employees.length === 0 || !passengerId || allowedModels.length === 0 || !vehicleModel}
//             onClick={() => {
//               if (!company) return;
//               const booking = makeNewChauffeurBooking(company.id, passengerId);
//               booking.vehicle_model = vehicleModel;
//               booking.trip_type = tripType;
//               booking.package = pkg;
//               booking.scheduled_at = toIsoLocal(scheduledAt);
//               upsertChauffeurBooking(booking);
//               alert("Booking created (mock). Check the recent bookings list below.");
//             }}
//             className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-md bg-orange px-4 text-sm font-semibold text-white disabled:opacity-50"
//           >
//             Create Booking
//           </button>

//           <div className="mt-6">
//             <div className="text-sm font-semibold text-navy">Recent Bookings</div>
//             <div className="mt-3 overflow-x-auto rounded-lg border border-border">
//               <table className="min-w-full text-sm">
//                 <thead className="bg-surface text-xs font-semibold tracking-wider text-muted">
//                   <tr>
//                     <th className="px-3 py-2 text-left">Booking</th>
//                     <th className="px-3 py-2 text-left">Company</th>
//                     <th className="px-3 py-2 text-left">Passenger</th>
//                     <th className="px-3 py-2 text-left">Status</th>
//                     <th className="px-3 py-2 text-right">Advance</th>
//                   </tr>
//                 </thead>
//                 <tbody className="divide-y divide-border bg-white">
//                   {recentBookings.map((b) => {
//                     const comp = db.companies.find((c) => c.id === b.company_id);
//                     const emp = comp?.employees.find((e) => e.id === b.passenger_employee_id);
//                     return (
//                       <tr key={b.id}>
//                         <td className="px-3 py-2">
//                           <div className="font-mono text-xs">{b.id}</div>
//                           <div className="text-xs text-muted">
//                             {b.trip_type} · {b.package} · {b.vehicle_model || "—"}
//                           </div>
//                         </td>
//                         <td className="px-3 py-2 text-ink">{comp?.name ?? "—"}</td>
//                         <td className="px-3 py-2 text-muted">{emp?.full_name ?? "—"}</td>
//                         <td className="px-3 py-2">
//                           <span className="rounded-full bg-navy/10 px-2 py-0.5 text-xs font-semibold text-navy">
//                             {b.status}
//                           </span>
//                         </td>
//                         <td className="px-3 py-2 text-right">
//                           <select
//                             value={b.status}
//                             onChange={(e) =>
//                               upsertChauffeurBooking({ ...b, status: e.target.value as ChauffeurBooking["status"] })
//                             }
//                             className="h-9 rounded-md border border-border bg-white px-2 text-sm outline-none focus:ring-2 focus:ring-blue/40"
//                           >
//                             <option value="searching">searching</option>
//                             <option value="driver_assigned">driver_assigned</option>
//                             <option value="arrived">arrived</option>
//                             <option value="in_progress">in_progress</option>
//                             <option value="completed">completed</option>
//                             <option value="cancelled">cancelled</option>
//                           </select>
//                         </td>
//                       </tr>
//                     );
//                   })}
//                   {recentBookings.length === 0 ? (
//                     <tr>
//                       <td className="px-3 py-8 text-center text-sm text-muted" colSpan={5}>
//                         No bookings yet.
//                       </td>
//                     </tr>
//                   ) : null}
//                 </tbody>
//               </table>
//             </div>
//           </div>

//           <div className="mt-3 text-xs text-muted">
//             Next: auto-assign nearest available car + fuel/OT calculation on completion (for invoicing).
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }


