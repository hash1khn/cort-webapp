'use client';

import { useFuelPriceAlert } from '../../hooks/useFuelPriceAlert';
import Link from 'next/link';
import { AlertTriangle, X } from 'lucide-react';

export const FuelPriceAlert = () => {
  const { showAlert, alertMessage, handleDismiss } = useFuelPriceAlert();

  if (!showAlert) return null;

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2">
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
        <p className="text-amber-900 dark:text-amber-200 text-xs font-medium truncate sm:whitespace-normal">
          {alertMessage}
        </p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <Link
          href="/admin/pricing"
          className="px-2.5 py-1 bg-amber-600 text-white text-[11px] font-semibold rounded-md hover:bg-amber-700 transition-colors whitespace-nowrap"
        >
          Update
        </Link>
        <button
          onClick={handleDismiss}
          className="p-1 text-amber-700 hover:bg-amber-500/20 rounded-md transition-colors"
          title="Dismiss alert"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
