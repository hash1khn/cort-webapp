"use client";

import { createContext, useContext, useMemo } from "react";
import { useAdminStore } from "../../admin/store/AdminStore";
import type { Company, Employee, ChauffeurBooking } from "../../admin/store/types";

type CompanyStore = {
  company: Company | null;
  employees: Employee[];
  bookings: ChauffeurBooking[];
  allowedVehicleModels: string[];
};

const Ctx = createContext<CompanyStore | null>(null);

export function CompanyStoreProvider({
  children,
  companyId,
}: {
  children: React.ReactNode;
  companyId: string | null;
}) {
  const { db } = useAdminStore();

  const company = useMemo(() => {
    if (!companyId) return null;
    return db.companies.find((c) => c.id === companyId) ?? null;
  }, [db.companies, companyId]);

  const employees = useMemo(() => {
    if (!company) return [];
    return company.employees;
  }, [company]);

  const bookings = useMemo(() => {
    if (!company) return [];
    return db.chauffeur_bookings.filter((b) => b.company_id === company.id);
  }, [db.chauffeur_bookings, company]);

  const allowedVehicleModels = useMemo(() => {
    if (!company) return [];
    return company.allowed_vehicle_models;
  }, [company]);

  const value: CompanyStore = useMemo(
    () => ({
      company,
      employees,
      bookings,
      allowedVehicleModels,
    }),
    [company, employees, bookings, allowedVehicleModels],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCompanyStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCompanyStore must be used within CompanyStoreProvider");
  return v;
}

