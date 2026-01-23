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
  vehicle_whitelists?: Array<{
    id: number;
    company_id: number;
    allowed_vehicle_model: string;
  }>;
};

type Employee = {
  id: string; // UUID from backend
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
  passenger_id: string; // UUID
  driver_id: string | null;
  vehicle_id: number | null;
  booking_type: string; // 'SPOT' | 'MONTHLY'
  package_selected: string; // 'HOURS_5' | 'HOURS_10' | 'HOURS_24'
  trip_type: string; // 'IN_CITY' | 'OUT_STATION'
  scheduled_for: string;
  status: string;
  fulfillment_type: string;
  internal_cost_center_code: string | null;
  created_at: string;
  // Related data
  users_chauffeur_bookings_passenger_idTousers?: {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
  };
  users_chauffeur_bookings_driver_idTousers?: {
    id: string;
    full_name: string;
    phone: string | null;
  };
  vehicles?: {
    id: number;
    model: string;
    plate_number: string;
  };
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
  updateEmployee: (id: string, data: Partial<Employee>) => Promise<void>;
  deactivateEmployee: (id: string, active: boolean) => Promise<void>;
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
  const [allowedVehicleModels, setAllowedVehicleModels] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Mocks
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

        const companyObj: Company = {
          id: rawCompany.id,
          name: rawCompany.name,
          email: rawCompany.email,
          logo_url: rawCompany.logo_url || null,
          services_enabled: {
            shuttle_enabled: rawCompany.is_shuttle_enabled || false,
            chauffeur_enabled: rawCompany.is_chauffeur_enabled || false,
          },
          vehicle_whitelists: rawCompany.vehicle_whitelists || [],
        };
        setCompany(companyObj);

        // Extract allowed vehicle models from whitelists
        const vehicleModels = (rawCompany.vehicle_whitelists || []).map(
          (wl: { allowed_vehicle_model: string }) => wl.allowed_vehicle_model
        );
        setAllowedVehicleModels(vehicleModels);

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

        // 3. Fetch Bookings for the company
        try {
          const bookingsRes = await fetch(`${API_URL}/companies/${companyId}/chauffeur-bookings`, { headers });
          if (bookingsRes.ok) {
            const bookingsData = await bookingsRes.json();
            setBookings(bookingsData.data?.data || []);
          } else {
            console.warn('Could not fetch bookings');
            setBookings([]);
          }
        } catch (e) {
          console.warn('Failed to fetch bookings', e);
          setBookings([]);
        }

        // Clear other data - these endpoints don't exist or aren't needed in company portal
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
      if (!company) throw new Error('No company found');

      setLoading(true);
      const token = localStorage.getItem('auth_token');
      if (!token) throw new Error('No auth_token found');

      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

      // Transform the booking data to match the new API structure
      const apiData = {
        booking_type: bookingData.package?.toString().includes('monthly') ? 'MONTHLY' : 'SPOT',
        package_selected: transformPackageType(bookingData.package as string),
        trip_type: transformTripType(bookingData.trip_type as string),
        pickup_location: {
          latitude: bookingData.pickup_lat as number,
          longitude: bookingData.pickup_lng as number,
        },
        scheduled_for: bookingData.scheduled_at as string,
        internal_cost_center_code: bookingData.internal_cost_center_code as string | undefined,
        passenger_id: bookingData.passenger_id as string | undefined, // Add the selected employee ID
      };

      const response = await fetch(`${API_URL}/companies/${company.id}/chauffeur-bookings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiData),
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

  // Helper function to transform package type
  const transformPackageType = (pkg: string): string => {
    const pkgMap: Record<string, string> = {
      '5hr': 'HOURS_5',
      '10hr': 'HOURS_10',
      '24hr': 'HOURS_24',
      'monthly_10hr': 'HOURS_10',
      'monthly_24hr': 'HOURS_24',
    };
    return pkgMap[pkg] || 'HOURS_10';
  };

  // Helper function to transform trip type
  const transformTripType = (tripType: string): string => {
    return tripType === 'in_city' ? 'IN_CITY' : 'OUT_STATION';
  };

  const updateEmployee = async (id: string, data: Partial<Employee>) => {
    // TODO: Implement API call
    console.log('Update employee', id, data);
    // Optimistic update
    setEmployees(prev => prev.map(e => e.id === id ? { ...e, ...data } : e));
  };

  const deactivateEmployee = async (id: string, active: boolean) => {
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
