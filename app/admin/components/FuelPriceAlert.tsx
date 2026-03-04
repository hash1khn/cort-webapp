'use client';

import { useFuelPriceAlert } from '../../hooks/useFuelPriceAlert';
import Link from 'next/link';

export const FuelPriceAlert = () => {
  const { showAlert, alertMessage, handleDismiss } = useFuelPriceAlert();

  if (!showAlert) return null;

  return (
    <div className="mb-6 p-4 bg-amber-50 border border-amber-300 rounded-lg flex items-center justify-between gap-4 shadow-sm">
      <div className="flex items-center gap-3 flex-1">
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-amber-600"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <p className="text-amber-800 font-medium text-sm sm:text-base flex-1">
          {alertMessage}
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Link
          href="/admin/pricing"
          className="px-4 py-2 bg-amber-600 text-white text-sm font-semibold rounded-md hover:bg-amber-700 transition-colors whitespace-nowrap"
        >
          Update Now
        </Link>
        <button
          onClick={handleDismiss}
          className="px-3 py-2 text-amber-700 hover:bg-amber-100 rounded-md transition-colors"
          title="Dismiss alert"
        >
          <svg
            className="h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};
