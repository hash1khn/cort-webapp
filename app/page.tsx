import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-surface text-ink">
      <div className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-16">
        <header className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <img
                src="/cort-with-at-your.svg"
                alt="Cort"
                className="h-12 w-auto drop-shadow-[0_1px_1px_rgba(0,0,0,0.12)]"
              />
              <div className="text-sm font-medium tracking-wide text-muted">Cort Operations</div>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-navy">
              Web Portal (Mock)
            </h1>
          </div>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-md bg-orange px-4 py-2 text-sm font-semibold text-white hover:opacity-95"
          >
            Sign In
          </Link>
        </header>

        <section className="rounded-xl border border-border bg-white p-6">
          <h2 className="text-lg font-semibold text-navy">What’s included</h2>
          <p className="mt-2 text-sm text-muted">
            Super Admin modules from <code className="font-mono">dev.md</code>{" "}
            implemented with in-browser mock data. No backend required.
          </p>
          <ul className="mt-4 grid gap-2 text-sm text-ink sm:grid-cols-2">
            <li>Company management (services, whitelist, employees CSV)</li>
            <li>Pricing/contracts + global fuel config</li>
            <li>Fleet repository + consumption master</li>
            <li>Shuttle operations (routes, assignments)</li>
            <li>Chauffeur dispatch (manual booking)</li>
            <li>Invoicing (mock generation + export stub)</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
