export default function CompanyLoading() {
    return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="flex flex-col items-center gap-3">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-orange/20 border-t-orange" />
                <p className="text-sm text-[var(--text-muted)]">Loading…</p>
            </div>
        </div>
    );
}
