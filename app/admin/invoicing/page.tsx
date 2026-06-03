"use client";

import { AdminProtectedPage } from "../components/AdminProtectedPage";
import { ADMIN_SUBJECTS } from "../../lib/abilities/admin-subjects";
import { useInvoices } from "./hooks/useInvoices";
import { InvoicingLedger } from "./components/InvoicingLedger";

export default function InvoicingPage() {
  return (
    <AdminProtectedPage permission="invoicing" subject={ADMIN_SUBJECTS.invoicing}>
      <InvoicingPageContent />
    </AdminProtectedPage>
  );
}

function InvoicingPageContent() {
  const inv = useInvoices();
  return <InvoicingLedger inv={inv} />;
}
