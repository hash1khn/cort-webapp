"use client";

import { createContext, useContext, useEffect, useState } from "react";

// Types based on backend structure
type Company = {
  id: number;
  name: string;
  email: string;
  logo_url: string | null;
  services_enabled: {
    shuttle_enabled: boolean;
    chauffeur_enabled: boolean;
  };
};

type Employee = {
  id: number;
  full_name: string;
  email: string;
  phone: string | null;
  status: string;
  company_id: number;
  employee_id?: string; // Optional as it might not be in all responses depending on backend
};

type Booking = {
  id: number;
  company_id: number;
  status: string;
  scheduled_at: string;
  vehicle_model: string;
  package: string;
  trip_type: string;
  passenger_employee_id: number;
  // Add other booking fields as needed
};

// Contract types
type ChauffeurContract = {
  id: string;
  company_id: string;
  base_fuel_price_pkr: number;
  contract_pct: number;
  is_auto_revision_enabled: boolean;
  base_rates: Array<{
    model: string;
    rate_5hr: number;
    rate_10hr: number;
    rate_24hr: number;
    monthly_10hr: number;
    monthly_24hr: number;
  }>;
};

type Vehicle = {
  id: number;
  plate_no: string;
  make: string;
  model: string;
  year: number;
  color: string;
};

// Mock types for missing endpoints
type ShuttleRoute = {
  id: string;
  name: string;
  company_id: number;
  driver_id: string | null;
  vehicle_id: number | null;
  stops: Array<{ id: string; name: string; eta_minutes_from_start: number }>;
};

type ShuttlePricing = {
  id: string;
  company_id: number;
  vehicle_id: number;
  fixed_monthly_amount_pkr: number;
};

type ShuttleDriver = {
  id: string;
  full_name: string;
  username: string;
};

type CompanyStore = {
  company: Company | null;
  employees: Employee[];
  bookings: Booking[];
  contract: ChauffeurContract | null;
  vehicles: Vehicle[];
  allowedVehicleModels: string[];

  // Mocked data for Shuttle Reports / Routes
  routes: ShuttleRoute[];
  shuttlePricing: ShuttlePricing[];
  shuttleDrivers: ShuttleDriver[];

  loading: boolean;
  error: string | null;

  createBooking: (booking: Record<string, unknown>) => Promise<void>;
  updateEmployee: (id: number, data: Partial<Employee>) => Promise<void>;
  deactivateEmployee: (id: number, active: boolean) => Promise<void>;
};

const Ctx = createContext<CompanyStore | null>(null);

export function CompanyStoreProvider({
  children,
  companyId,
}: {
  children: React.ReactNode;
  companyId: string | null;
}) {
  const [company, setCompany] = useState<Company | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [contract, setContract] = useState<ChauffeurContract | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Mocks
  const allowedVehicleModels = ["Sedan", "SUV", "Van", "Mini Bus"];
  const routes: ShuttleRoute[] = [];
  const shuttlePricing: ShuttlePricing[] = [];
  const shuttleDrivers: ShuttleDriver[] = [];

  useEffect(() => {
    async function fetchCompanyData() {
      if (!companyId) {
        setCompany(null);
        setEmployees([]);
        setBookings([]);
        setContract(null);
        setVehicles([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem('auth_token');
        if (!token) {
          throw new Error('No auth token found');
        }

        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
        const headers = {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        };

        // 1. Fetch Company
        const companyRes = await fetch(`${API_URL}/companies/${companyId}`, { headers });
        if (!companyRes.ok) throw new Error(`Failed to fetch company: ${companyRes.status}`);
        const companyData = await companyRes.json();
        const rawCompany = companyData.data || companyData;

        const companyObj = {
          id: rawCompany.id,
          name: rawCompany.name,
          email: rawCompany.email,
          logo_url: rawCompany.logo_url || null,
          services_enabled: {
            shuttle_enabled: rawCompany.is_shuttle_enabled || false,
            chauffeur_enabled: rawCompany.is_chauffeur_enabled || false,
          },
        };
        setCompany(companyObj);

        // 2. Fetch Employees using the new endpoint
        try {
          const empRes = await fetch(`${API_URL}/employees/company/${companyId}`, { headers });
          if (empRes.ok) {
            const empData = await empRes.json();
            setEmployees(empData.data?.data || []);
          } else {
            console.warn('Could not fetch employees');
            setEmployees([]);
          }
        } catch (e) {
          console.warn('Failed to fetch employees', e);
          setEmployees([]);
        }

        // Clear other data - these endpoints don't exist or aren't needed in company portal
        setBookings([]);
        setContract(null);
        setVehicles([]);

      } catch (err) {
        console.error('Error fetching company data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load company');
        setCompany(null);
        setEmployees([]);
        setBookings([]);
        setContract(null);
        setVehicles([]);
      } finally {
        setLoading(false);
      }
    }

    fetchCompanyData();
  }, [companyId]);

  const createBooking = async (bookingData: Record<string, unknown>) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      if (!token) throw new Error('No auth token found');

      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
      const response = await fetch(`${API_URL}/bookings/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create booking');
      }
      return await response.json();
    } catch (err) {
      console.error('Error creating booking:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateEmployee = async (id: number, data: Partial<Employee>) => {
    // TODO: Implement API call
    console.log('Update employee', id, data);
    // Optimistic update
    setEmployees(prev => prev.map(e => e.id === id ? { ...e, ...data } : e));
  };

  const deactivateEmployee = async (id: number, active: boolean) => {
    // TODO: Implement API call
    console.log('Deactivate employee', id, active);
    // Optimistic update
    setEmployees(prev => prev.map(e => e.id === id ? { ...e, status: active ? 'active' : 'inactive' } : e));
  };

  const value: CompanyStore = {
    company,
    employees,
    bookings,
    contract,
    vehicles,
    allowedVehicleModels,
    routes,
    shuttlePricing,
    shuttleDrivers,
    loading,
    error,
    createBooking,
    updateEmployee,
    deactivateEmployee,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCompanyStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCompanyStore must be used within CompanyStoreProvider");
  return v;
}
