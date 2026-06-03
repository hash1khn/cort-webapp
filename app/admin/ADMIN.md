# Admin portal conventions

## Route protection

Wrap authenticated admin pages with `AdminProtectedPage`:

```tsx
<AdminProtectedPage permission="vendors" subject={ADMIN_SUBJECTS.vendors}>
  <PageContent />
</AdminProtectedPage>
```

Super-admin-only routes use `SuperAdminPage` (e.g. Staff & Permissions).

`ConfirmProvider` is mounted in `app/admin/layout.tsx`; use `useConfirm()` for destructive actions.

## Data fetching

| Pattern | When to use |
|---------|-------------|
| Redux slice (`app/lib/store/slices/admin*`) | List CRUD with filters persisted in slice (companies, drivers, vendors, vehicles) |
| `apiClient` + local state / hook | Reports, invoicing, expenses, company detail, bookings |

## Feedback

- Prefer `toast` from `sonner` for success and error messages.
- Use `useConfirm()` instead of `window.confirm()` for destructive flows.

## Shared utilities

- `useDebounce` — `app/lib/hooks/useDebounce.ts`
- `useConfirm` — `app/lib/hooks/useConfirm.ts`
- `cx` — `app/admin/components/ui/cx.ts`
- `Modal`, `Badge` — `app/admin/components/ui/`

## UI primitives

- CRUD modals: `admin/components/ui/Modal.tsx`
- Routes / maps: `admin/ui/` (Button, Card, Map, etc.)
- Theme-aware class helpers: `admin/components/ui/admin-styles.ts` — prefer these over `bg-white` / `text-gray-*`

## Theme & layout

- Dark/light toggle: sidebar footer (Sun/Moon icon). Preference stored in `localStorage` key `cort-admin-theme` (default: light).
- Desktop sidebar collapse: chevron on sidebar edge; state stored in `cort-admin-sidebar-collapsed`.
- Use CSS variables (`var(--bg-card)`, `var(--text-primary)`, etc.) or `admin-styles.ts` helpers for new UI. Legacy pages are bridged via `admin-theme.css` in dark mode.

## Leads

Landing leads use `dashboard` read permission (matches backend `@CrudPermission('dashboard', 'read')`).
