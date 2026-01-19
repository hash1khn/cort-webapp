export type Id = string;

export type ServiceToggles = {
  shuttle_enabled: boolean;
  chauffeur_enabled: boolean;
};

export type Employee = {
  id: Id;
  full_name: string;
  phone: string;
  email: string;
  employee_id: string;
  route_id?: string;
  stop_id?: string;
  status: "active" | "inactive";
  username: string;
  password: string;
};

export type Company = {
  id: Id;
  name: string;
  address: string;
  ntn: string;
  contact_person: string;
  email: string;
  services_enabled: ServiceToggles;
  allowed_vehicle_models: string[];
  employees: Employee[];
  created_at: string;
};

export type Vehicle = {
  id: Id;
  plate_no: string;
  make: string;
  model: string;
  year: number;
  color: string;
  ownership: "owned" | "partner";
  fuel_avg_in_city_km_per_l: number;
  fuel_avg_out_station_km_per_l: number;
  is_active: boolean;
};

export type ChauffeurBaseRate = {
  model: string;
  rate_5hr: number;
  rate_10hr: number;
  rate_24hr: number;
  monthly_10hr: number;
  monthly_24hr: number;
};

export type ChauffeurContract = {
  id: Id;
  company_id: Id;
  base_fuel_price_pkr: number;
  contract_pct: number; // adjustment factor, e.g. 0.2
  overtime_rate_per_hour: number;
  outstation_allowance_per_day: number;
  driver_accommodation_per_night: number;
  base_rates: ChauffeurBaseRate[];
  is_auto_revision_enabled: boolean;
  created_at: string;
  updated_at: string;
};

export type ShuttleAssetPricing = {
  id: Id;
  company_id: Id;
  vehicle_id: Id;
  fixed_monthly_amount_pkr: number;
  created_at: string;
  updated_at: string;
};

export type ShuttleDriver = {
  id: Id;
  full_name: string;
  username: string;
  password: string;
  vehicle_id: Id | null;
  is_active: boolean;
  created_at: string;
};

export type ChauffeurDriverSignup = {
  id: Id;
  full_name: string;
  phone: string;
  cnic: string;
  license_no: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_year: number;
  plate_no: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  decided_at?: string;
};

export type ShuttleStop = {
  id: Id;
  name: string;
  eta_minutes_from_start: number;
  lat?: number; // Latitude for map
  lng?: number; // Longitude for map
};

export type ShuttleRoute = {
  id: Id;
  name: string;
  polyline_mock?: string;
  stops: ShuttleStop[];
  company_id: Id | null;
  driver_id: Id | null; // ShuttleDriver
  vehicle_id: Id | null; // Vehicle
  created_at: string;
  updated_at: string;
};

export type ChauffeurCar = {
  id: Id;
  driver_name: string;
  model: string;
  plate_no: string;
  status: "available" | "in_trip" | "offline";
  last_seen_at: string;
  lat?: number; // Current latitude for map
  lng?: number; // Current longitude for map
};

export type ChauffeurBooking = {
  id: Id;
  company_id: Id;
  passenger_employee_id: Id;
  vehicle_model: string;
  trip_type: "in_city" | "out_station";
  package: "5hr" | "10hr" | "24hr" | "monthly_10hr" | "monthly_24hr";
  scheduled_at: string;
  status: "pending" | "searching" | "driver_assigned" | "arrived" | "in_progress" | "completed" | "cancelled";
  driver_car_id?: Id; // ChauffeurCar id when assigned
  driver_name?: string; // Driver name for display
  driver_phone?: string; // Driver phone for contact
  plate_no?: string; // Vehicle plate number
  approved_at?: string; // When superadmin approved
  approved_by?: string; // Superadmin identifier
  pickup_address?: string; // Pickup location address
  pickup_lat?: number; // Pickup latitude
  pickup_lng?: number; // Pickup longitude
  dropoff_address?: string; // Dropoff location address
  dropoff_lat?: number; // Dropoff latitude
  dropoff_lng?: number; // Dropoff longitude
  created_at: string;
  updated_at: string;
};

export type AdminDb = {
  companies: Company[];
  vehicles: Vehicle[];
  fuel_price_pkr: number;
  chauffeur_contracts: ChauffeurContract[];
  shuttle_asset_pricing: ShuttleAssetPricing[];
  shuttle_drivers: ShuttleDriver[];
  chauffeur_driver_signups: ChauffeurDriverSignup[];
  shuttle_routes: ShuttleRoute[];
  chauffeur_cars: ChauffeurCar[];
  chauffeur_bookings: ChauffeurBooking[];
  updated_at: string;
};


