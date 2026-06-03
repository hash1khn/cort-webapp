/** Theme-aware class strings for admin UI — use instead of bg-white / text-gray-* */

export const adminCard =
  "rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] shadow-[var(--shadow-card)]";

export const adminCardPadding = `${adminCard} p-4`;

export const adminPanel = `${adminCard} overflow-hidden`;

export const adminStatCard = `${adminCardPadding}`;

export const adminInput =
  "w-full rounded-lg border border-[var(--border-input)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-placeholder)] focus:border-[var(--cort-orange)] focus:ring-1 focus:ring-[var(--cort-orange)]";

export const adminSelect = adminInput;

export const adminTableHead =
  "bg-[var(--bg-subtle)] text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]";

export const adminTableRow = "hover:bg-[var(--row-hover)] transition-colors";

export const adminPageTitle = "text-2xl font-semibold tracking-tight text-[var(--text-primary)]";

export const adminEyebrow = "text-sm font-medium text-[var(--text-muted)]";

export const adminModalTitle = "text-lg font-bold text-[var(--text-primary)]";

export const adminBtnOutline =
  "inline-flex items-center justify-center rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--row-hover)] transition-colors disabled:opacity-50 disabled:pointer-events-none";

export const adminBtnSecondary =
  "inline-flex items-center justify-center rounded-lg border border-[var(--border-default)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--row-hover)] transition-colors disabled:opacity-50";

export const adminBtnPrimary =
  "inline-flex items-center justify-center rounded-lg bg-[var(--cort-navy)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-colors disabled:opacity-50";

export const adminBtnDestructive =
  "inline-flex items-center justify-center rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 transition-colors disabled:opacity-50";

export const adminModalHeader =
  "flex items-center justify-between border-b border-[var(--border-default)] px-6 py-4 sticky top-0 bg-[var(--bg-card)] rounded-t-xl z-10";

export const adminModalBody = "p-6 max-h-[80vh] overflow-y-auto text-[var(--text-primary)]";

export const adminModalShell =
  "relative w-full rounded-xl bg-[var(--bg-card)] shadow-[var(--shadow-modal)] ring-1 ring-[var(--border-default)] animate-in fade-in zoom-in duration-200 my-auto";

export const badgeColorsLight = {
  blue: "bg-blue-100 text-blue-700",
  green: "bg-green-100 text-green-700",
  red: "bg-red-100 text-red-700",
  orange: "bg-orange-100 text-orange-800",
  purple: "bg-purple-100 text-purple-700",
  gray: "bg-slate-100 text-slate-700",
} as const;

export const badgeColorsDark = {
  blue: "bg-blue-500/15 text-blue-400",
  green: "bg-emerald-500/15 text-emerald-400",
  red: "bg-red-500/15 text-red-400",
  orange: "bg-orange-500/15 text-orange-400",
  purple: "bg-purple-500/15 text-purple-400",
  gray: "bg-slate-500/15 text-slate-400",
} as const;

export type BadgeColor = keyof typeof badgeColorsLight;
