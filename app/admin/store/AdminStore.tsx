"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type {
  AdminDb,
  ChauffeurContract,
  ChauffeurBooking,
  ChauffeurCar,
  ChauffeurDriverSignup,
  Company,
  Employee,
  ShuttleAssetPricing,
  ShuttleDriver,
  ShuttleRoute,
  ShuttleStop,
  Vehicle,
} from "./types";
import { seedDb, SEED_VEHICLE_MODELS } from "./seed";

const STORAGE_KEY = "cort.admin.db.v1";

type AdminStore = {
  db: AdminDb;
  reset: () => void;

  vehicleModels: string[];

  setFuelPrice: (pkr: number) => void;
  upsertChauffeurContract: (contract: ChauffeurContract) => void;
  upsertShuttleAssetPricing: (pricing: ShuttleAssetPricing) => void;
  deleteShuttleAssetPricing: (id: string) => void;

  upsertVehicle: (vehicle: Vehicle) => void;
  deleteVehicle: (id: string) => void;

  createShuttleDriver: (fullName: string) => void;
  assignShuttleDriverVehicle: (driverId: string, vehicleId: string | null) => void;
  setShuttleDriverActive: (driverId: string, isActive: boolean) => void;

  decideChauffeurSignup: (signupId: string, decision: "approved" | "rejected") => void;

  upsertShuttleRoute: (route: ShuttleRoute) => void;
  deleteShuttleRoute: (id: string) => void;

  upsertChauffeurCar: (car: ChauffeurCar) => void;
  upsertChauffeurBooking: (booking: ChauffeurBooking) => void;

  upsertCompany: (input: Omit<Company, "created_at"> & Partial<Pick<Company, "created_at">>) => void;
  deleteCompany: (companyId: string) => void;
  upsertEmployee: (companyId: string, employee: Employee) => void;
  deactivateEmployee: (companyId: string, employeeId: string, isInactive: boolean) => void;
};

const Ctx = createContext<AdminStore | null>(null);

function safeParse(json: string | null): AdminDb | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as AdminDb;
  } catch {
    return null;
  }
}

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function normalizeUsername(fullName: string) {
  return fullName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .slice(0, 2)
    .join(".");
}

function randomPassword() {
  return `cort-${Math.random().toString(36).slice(2, 8)}`;
}

export function AdminStoreProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<AdminDb>(() => seedDb());

  // Hydrate from localStorage
  useEffect(() => {
    const parsed = safeParse(window.localStorage.getItem(STORAGE_KEY));
    if (parsed) setDb(parsed);
  }, []);

  // Persist to localStorage
  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  }, [db]);

  const reset = useCallback(() => {
    const next = seedDb();
    setDb(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const setFuelPrice = useCallback((pkr: number) => {
    setDb((prev) => {
      const now = new Date().toISOString();
      return { ...prev, fuel_price_pkr: pkr, updated_at: now };
    });
  }, []);

  const upsertChauffeurContract = useCallback((contract: ChauffeurContract) => {
    setDb((prev) => {
      const now = new Date().toISOString();
      const idx = prev.chauffeur_contracts.findIndex((c) => c.id === contract.id);
      const next: ChauffeurContract = { ...contract, updated_at: now };
      const chauffeur_contracts = [...prev.chauffeur_contracts];
      if (idx >= 0) chauffeur_contracts[idx] = next;
      else chauffeur_contracts.unshift({ ...next, created_at: now });
      return { ...prev, chauffeur_contracts, updated_at: now };
    });
  }, []);

  const upsertShuttleAssetPricing = useCallback((pricing: ShuttleAssetPricing) => {
    setDb((prev) => {
      const now = new Date().toISOString();
      const idx = prev.shuttle_asset_pricing.findIndex((p) => p.id === pricing.id);
      const next: ShuttleAssetPricing = { ...pricing, updated_at: now };
      const shuttle_asset_pricing = [...prev.shuttle_asset_pricing];
      if (idx >= 0) shuttle_asset_pricing[idx] = next;
      else shuttle_asset_pricing.unshift({ ...next, created_at: now });
      return { ...prev, shuttle_asset_pricing, updated_at: now };
    });
  }, []);

  const deleteShuttleAssetPricing = useCallback((id: string) => {
    setDb((prev) => {
      const now = new Date().toISOString();
      return {
        ...prev,
        shuttle_asset_pricing: prev.shuttle_asset_pricing.filter((p) => p.id !== id),
        updated_at: now,
      };
    });
  }, []);

  const upsertVehicle = useCallback((vehicle: Vehicle) => {
    setDb((prev) => {
      const now = new Date().toISOString();
      const idx = prev.vehicles.findIndex((v) => v.id === vehicle.id);
      const vehicles = [...prev.vehicles];
      if (idx >= 0) vehicles[idx] = vehicle;
      else vehicles.unshift(vehicle);
      return { ...prev, vehicles, updated_at: now };
    });
  }, []);

  const deleteVehicle = useCallback((id: string) => {
    setDb((prev) => {
      const now = new Date().toISOString();
      return {
        ...prev,
        vehicles: prev.vehicles.filter((v) => v.id !== id),
        shuttle_asset_pricing: prev.shuttle_asset_pricing.filter((p) => p.vehicle_id !== id),
        shuttle_drivers: prev.shuttle_drivers.map((d) => (d.vehicle_id === id ? { ...d, vehicle_id: null } : d)),
        updated_at: now,
      };
    });
  }, []);

  const createShuttleDriver = useCallback((fullName: string) => {
    setDb((prev) => {
      const now = new Date().toISOString();
      const base = normalizeUsername(fullName || "driver");
      const driver: ShuttleDriver = {
        id: uid("sd"),
        full_name: fullName || "Shuttle Driver",
        username: base,
        password: randomPassword(),
        vehicle_id: null,
        is_active: true,
        created_at: now,
      };
      return { ...prev, shuttle_drivers: [driver, ...prev.shuttle_drivers], updated_at: now };
    });
  }, []);

  const assignShuttleDriverVehicle = useCallback((driverId: string, vehicleId: string | null) => {
    setDb((prev) => {
      const now = new Date().toISOString();
      const shuttle_drivers = prev.shuttle_drivers.map((d) =>
        d.id === driverId ? { ...d, vehicle_id: vehicleId } : d,
      );
      return { ...prev, shuttle_drivers, updated_at: now };
    });
  }, []);

  const setShuttleDriverActive = useCallback((driverId: string, isActive: boolean) => {
    setDb((prev) => {
      const now = new Date().toISOString();
      const shuttle_drivers = prev.shuttle_drivers.map((d) =>
        d.id === driverId ? { ...d, is_active: isActive } : d,
      );
      return { ...prev, shuttle_drivers, updated_at: now };
    });
  }, []);

  const decideChauffeurSignup = useCallback((signupId: string, decision: "approved" | "rejected") => {
    setDb((prev) => {
      const now = new Date().toISOString();
      const chauffeur_driver_signups = prev.chauffeur_driver_signups.map((s) =>
        s.id === signupId ? ({ ...s, status: decision, decided_at: now } as ChauffeurDriverSignup) : s,
      );
      return { ...prev, chauffeur_driver_signups, updated_at: now };
    });
  }, []);

  const upsertShuttleRoute = useCallback((route: ShuttleRoute) => {
    setDb((prev) => {
      const now = new Date().toISOString();
      const idx = prev.shuttle_routes.findIndex((r) => r.id === route.id);
      const next: ShuttleRoute = { ...route, updated_at: now };
      const shuttle_routes = [...prev.shuttle_routes];
      if (idx >= 0) shuttle_routes[idx] = next;
      else shuttle_routes.unshift({ ...next, created_at: now });
      return { ...prev, shuttle_routes, updated_at: now };
    });
  }, []);

  const deleteShuttleRoute = useCallback((id: string) => {
    setDb((prev) => {
      const now = new Date().toISOString();
      return { ...prev, shuttle_routes: prev.shuttle_routes.filter((r) => r.id !== id), updated_at: now };
    });
  }, []);

  const upsertChauffeurCar = useCallback((car: ChauffeurCar) => {
    setDb((prev) => {
      const now = new Date().toISOString();
      const idx = prev.chauffeur_cars.findIndex((c) => c.id === car.id);
      const next: ChauffeurCar = { ...car, last_seen_at: now };
      const chauffeur_cars = [...prev.chauffeur_cars];
      if (idx >= 0) chauffeur_cars[idx] = next;
      else chauffeur_cars.unshift(next);
      return { ...prev, chauffeur_cars, updated_at: now };
    });
  }, []);

  const upsertChauffeurBooking = useCallback((booking: ChauffeurBooking) => {
    setDb((prev) => {
      const now = new Date().toISOString();
      const idx = prev.chauffeur_bookings.findIndex((b) => b.id === booking.id);
      const next: ChauffeurBooking = { ...booking, updated_at: now };
      const chauffeur_bookings = [...prev.chauffeur_bookings];
      if (idx >= 0) chauffeur_bookings[idx] = next;
      else chauffeur_bookings.unshift({ ...next, created_at: now });
      return { ...prev, chauffeur_bookings, updated_at: now };
    });
  }, []);

  const upsertCompany = useCallback((input: Omit<Company, "created_at"> & Partial<Pick<Company, "created_at">>) => {
    setDb((prev) => {
      const now = new Date().toISOString();
      const existingIdx = prev.companies.findIndex((c) => c.id === input.id);
      const company: Company = {
        ...input,
        created_at: input.created_at ?? (existingIdx >= 0 ? prev.companies[existingIdx]!.created_at : now),
      } as Company;

      const companies = [...prev.companies];
      if (existingIdx >= 0) companies[existingIdx] = company;
      else companies.unshift(company);

      return { ...prev, companies, updated_at: now };
    });
  }, []);

  const deleteCompany = useCallback((companyId: string) => {
    setDb((prev) => {
      const now = new Date().toISOString();
      return {
        ...prev,
        companies: prev.companies.filter((c) => c.id !== companyId),
        updated_at: now,
      };
    });
  }, []);

  const upsertEmployee = useCallback((companyId: string, employee: Employee) => {
    setDb((prev) => {
      const now = new Date().toISOString();
      const companies = prev.companies.map((c) => {
        if (c.id !== companyId) return c;
        const idx = c.employees.findIndex((e) => e.id === employee.id);
        const employees = [...c.employees];
        if (idx >= 0) employees[idx] = employee;
        else employees.unshift(employee);
        return { ...c, employees };
      });
      return { ...prev, companies, updated_at: now };
    });
  }, []);

  const deactivateEmployee = useCallback((companyId: string, employeeId: string, isInactive: boolean) => {
    setDb((prev) => {
      const now = new Date().toISOString();
      const nextStatus: Employee["status"] = isInactive ? "inactive" : "active";
      const companies = prev.companies.map((c) => {
        if (c.id !== companyId) return c;
        const employees = c.employees.map((e) =>
          e.id === employeeId ? { ...e, status: nextStatus } : e,
        );
        return { ...c, employees };
      });
      return { ...prev, companies, updated_at: now };
    });
  }, []);

  const vehicleModels = useMemo(() => {
    const fromFleet = new Set<string>();
    for (const v of db.vehicles) if (v.is_active) fromFleet.add(v.model);
    for (const m of SEED_VEHICLE_MODELS) fromFleet.add(m);
    return Array.from(fromFleet).sort((a, b) => a.localeCompare(b));
  }, [db.vehicles]);

  const value: AdminStore = useMemo(
    () => ({
      db,
      reset,
      vehicleModels,
      setFuelPrice,
      upsertChauffeurContract,
      upsertShuttleAssetPricing,
      deleteShuttleAssetPricing,
      upsertVehicle,
      deleteVehicle,
      createShuttleDriver,
      assignShuttleDriverVehicle,
      setShuttleDriverActive,
      decideChauffeurSignup,
      upsertShuttleRoute,
      deleteShuttleRoute,
      upsertChauffeurCar,
      upsertChauffeurBooking,
      upsertCompany,
      deleteCompany,
      upsertEmployee,
      deactivateEmployee,
    }),
    [
      db,
      reset,
      vehicleModels,
      setFuelPrice,
      upsertChauffeurContract,
      upsertShuttleAssetPricing,
      deleteShuttleAssetPricing,
      upsertVehicle,
      deleteVehicle,
      createShuttleDriver,
      assignShuttleDriverVehicle,
      setShuttleDriverActive,
      decideChauffeurSignup,
      upsertShuttleRoute,
      deleteShuttleRoute,
      upsertChauffeurCar,
      upsertChauffeurBooking,
      upsertCompany,
      deleteCompany,
      upsertEmployee,
      deactivateEmployee,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAdminStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAdminStore must be used within AdminStoreProvider");
  return v;
}

export function makeNewCompany(): Company {
  const now = new Date().toISOString();
  return {
    id: uid("cmp"),
    name: "",
    address: "",
    ntn: "",
    contact_person: "",
    email: "",
    services_enabled: { shuttle_enabled: false, chauffeur_enabled: true },
    allowed_vehicle_models: [],
    employees: [],
    created_at: now,
  };
}

export function makeNewEmployee(fullName: string): Employee {
  const base = normalizeUsername(fullName || "user");
  return {
    id: uid("emp"),
    full_name: fullName,
    phone: "",
    email: "",
    employee_id: "",
    status: "active",
    username: base,
    password: randomPassword(),
  };
}

export function makeNewChauffeurContract(companyId: string, currentFuelPrice: number): ChauffeurContract {
  const now = new Date().toISOString();
  return {
    id: uid("cc"),
    company_id: companyId,
    base_fuel_price_pkr: currentFuelPrice,
    contract_pct: 0.2,
    overtime_rate_per_hour: 800,
    outstation_allowance_per_day: 2500,
    driver_accommodation_per_night: 3000,
    base_rates: [],
    is_auto_revision_enabled: true,
    created_at: now,
    updated_at: now,
  };
}

export function makeNewShuttleAssetPricing(companyId: string): ShuttleAssetPricing {
  const now = new Date().toISOString();
  return {
    id: uid("sap"),
    company_id: companyId,
    vehicle_id: "",
    fixed_monthly_amount_pkr: 150000,
    created_at: now,
    updated_at: now,
  };
}

export function makeNewVehicle(): Vehicle {
  return {
    id: uid("veh"),
    plate_no: "",
    make: "",
    model: "",
    year: new Date().getFullYear(),
    color: "",
    ownership: "owned",
    fuel_avg_in_city_km_per_l: 10,
    fuel_avg_out_station_km_per_l: 12,
    is_active: true,
  };
}

export function makeNewShuttleRoute(): ShuttleRoute {
  const now = new Date().toISOString();
  return {
    id: uid("rt"),
    name: "",
    polyline_mock: "",
    stops: [],
    company_id: null,
    driver_id: null,
    vehicle_id: null,
    created_at: now,
    updated_at: now,
  };
}

export function makeNewStop(): ShuttleStop {
  return { id: uid("st"), name: "", eta_minutes_from_start: 0 };
}

export function makeNewChauffeurBooking(companyId: string, passengerEmployeeId: string): ChauffeurBooking {
  const now = new Date().toISOString();
  return {
    id: uid("bk"),
    company_id: companyId,
    passenger_employee_id: passengerEmployeeId,
    vehicle_model: "",
    trip_type: "in_city",
    package: "10hr",
    scheduled_at: now,
    status: "searching",
    created_at: now,
    updated_at: now,
  };
}

export type {
  AdminDb,
  ChauffeurContract,
  ChauffeurBooking,
  ChauffeurCar,
  ChauffeurDriverSignup,
  Company,
  Employee,
  ShuttleAssetPricing,
  ShuttleDriver,
  ShuttleRoute,
  ShuttleStop,
  Vehicle,
};


