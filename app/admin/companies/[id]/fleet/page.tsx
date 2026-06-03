'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { FleetEfficiencyPanel } from '@/app/admin/components/FleetEfficiencyPanel';
import { AdminProtectedPage } from '@/app/admin/components/AdminProtectedPage';
import { ADMIN_SUBJECTS } from '@/app/lib/abilities/admin-subjects';

export default function CompanyFleetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const companyId = parseInt(id, 10);

  return (
    <AdminProtectedPage permission="company_features" subject={ADMIN_SUBJECTS.company_features}>
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <Link
            href={`/admin/companies/${id}`}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Company
          </Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-xl font-semibold text-gray-900">Fleet Efficiency</h1>
        </div>

        <FleetEfficiencyPanel companyId={companyId} />
      </div>
    </div>
    </AdminProtectedPage>
  );
}
