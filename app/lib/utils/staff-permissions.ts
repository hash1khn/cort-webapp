import {
  CRUD_ACTIONS,
  PERMISSION_KEYS,
  PermissionKey,
  SectionCrudPermissions,
  StaffPermissions,
} from "../types/auth-types";

export function emptySectionCrud(): SectionCrudPermissions {
  return { create: false, read: false, update: false, delete: false };
}

export function fullSectionCrud(): SectionCrudPermissions {
  return { create: true, read: true, update: true, delete: true };
}

export function normalizeSectionCrud(raw: unknown): SectionCrudPermissions {
  if (raw === true) return fullSectionCrud();
  if (raw === false || raw == null) return emptySectionCrud();
  if (typeof raw !== "object" || raw === null) return emptySectionCrud();
  const o = raw as Record<string, unknown>;
  const out = emptySectionCrud();
  for (const a of CRUD_ACTIONS) {
    out[a] = Boolean(o[a]);
  }
  return out;
}

export function emptyStaffPermissions(): StaffPermissions {
  return Object.fromEntries(
    PERMISSION_KEYS.map((k) => [k, emptySectionCrud()]),
  ) as StaffPermissions;
}

export function fullStaffPermissions(): StaffPermissions {
  return Object.fromEntries(
    PERMISSION_KEYS.map((k) => [k, fullSectionCrud()]),
  ) as StaffPermissions;
}

export function normalizeStaffPermissions(raw: unknown): StaffPermissions {
  const out = emptyStaffPermissions();
  if (!raw || typeof raw !== "object") return out;
  const obj = raw as Record<string, unknown>;
  for (const key of PERMISSION_KEYS) {
    out[key] = normalizeSectionCrud(obj[key]);
  }
  return out;
}

export function sectionHasAnyCrud(
  perms: StaffPermissions | null | undefined,
  key: PermissionKey,
): boolean {
  if (!perms?.[key]) return false;
  return CRUD_ACTIONS.some((a) => perms[key][a]);
}

export function staffHasCrud(
  perms: StaffPermissions | null | undefined,
  key: PermissionKey,
  action: keyof SectionCrudPermissions,
): boolean {
  if (!perms) return false;
  return Boolean(perms[key]?.[action]);
}
