'use client';

import { FuelPriceAlert } from '../components/FuelPriceAlert';

/**
 * TEMPORARY DEMO PAGE
 * Shows the Fuel Price Alert component
 * Visit: http://localhost:3000/admin/fuel-price-alert-demo
 * 
 * To test:
 * - The alert will show if today is the 1st or 16th of the month
 * - Or you can modify the date check in useFuelPriceAlert.ts for testing
 */

export default function FuelPriceAlertDemoPage() {
  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-navy mb-2">Fuel Price Alert Demo</h1>
          <p className="text-muted">Preview of the alert component in the admin dashboard</p>
        </div>

        {/* Demo Box */}
        <div className="bg-white p-6 rounded-lg border border-border shadow-sm">
          <h2 className="text-lg font-semibold text-navy mb-4">Alert Preview:</h2>
          
          {/* Alert Component */}
          <FuelPriceAlert />

          {/* Info */}
          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">ℹ️ Alert Details:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Shows on the <strong>1st and 16th</strong> of every month</li>
              <li>• Displays message: "Reminder: Please update fuel prices..."</li>
              <li>• <strong>Update Now</strong> button redirects to /admin/pricing</li>
              <li>• <strong>Dismiss</strong> button hides alert for the current day</li>
              <li>• Uses localStorage to track dismissed alerts</li>
              <li>• Current date: <strong>{new Date().toDateString()}</strong></li>
              <li>• Current day of month: <strong>{new Date().getDate()}</strong></li>
            </ul>
          </div>

          {/* Testing Instructions */}
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="font-semibold text-yellow-900 mb-2">🧪 Testing Instructions:</h3>
            <ol className="text-sm text-yellow-800 space-y-1">
              <li>1. To test the alert, modify the date check in <code className="bg-yellow-100 px-2 py-1 rounded">app/hooks/useFuelPriceAlert.ts</code></li>
              <li>2. Replace: <code className="bg-yellow-100 px-2 py-1 rounded">if (today === 1 || today === 16)</code></li>
              <li>3. With: <code className="bg-yellow-100 px-2 py-1 rounded">if (true)</code> to always show</li>
              <li>4. Or change to: <code className="bg-yellow-100 px-2 py-1 rounded">if (today === 4)</code> (today's date) to test on demand</li>
              <li>5. Then refresh this page</li>
            </ol>
          </div>
        </div>

        {/* Integration Info */}
        <div className="mt-8 bg-white p-6 rounded-lg border border-border shadow-sm">
          <h2 className="text-lg font-semibold text-navy mb-4">📦 Integration in Admin Dashboard:</h2>
          <p className="text-muted text-sm mb-4">
            The alert is already integrated into your main admin dashboard at <code className="bg-slate-100 px-2 py-1 rounded">/admin</code>
          </p>
          <div className="bg-slate-100 p-4 rounded text-sm font-mono text-slate-800 overflow-x-auto">
            {`// In app/admin/page.tsx

return (
  <div className="flex flex-col gap-6">
    {/* Fuel Price Alert */}
    <FuelPriceAlert />
    
    {/* Rest of dashboard... */}
  </div>
);`}
          </div>
        </div>
      </div>
    </div>
  );
}
