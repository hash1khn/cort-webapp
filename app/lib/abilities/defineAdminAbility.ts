import { AbilityBuilder, createMongoAbility, MongoAbility } from "@casl/ability";
import { AuthUser, UserRole, PERMISSION_KEYS } from "../types/auth-types";
import { ADMIN_SUBJECTS, AdminSubject } from "./admin-subjects";

/** CRUD-style actions for admin UI; `manage` implies all actions on a subject (CASL convention). */
export type AdminCrudAction = "create" | "read" | "update" | "delete" | "manage";

export type AppAbility = MongoAbility<[AdminCrudAction, AdminSubject]>;

/**
 * Subjects where only `read` is granted from the backend for staff (e.g. analytics-only sections).
 */
const READ_ONLY_SUBJECTS = new Set<AdminSubject>([ADMIN_SUBJECTS.dashboard]);

export function defineAdminAbility(user: AuthUser | null): AppAbility {
  const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

  if (!user) {
    return build();
  }

  if (user.role === UserRole.SUPER_ADMIN) {
    for (const subject of Object.values(ADMIN_SUBJECTS) as AdminSubject[]) {
      can("manage", subject);
    }
    return build();
  }

  if (user.role === UserRole.INTERNAL_STAFF && user.permissions) {
    const p = user.permissions;
    for (const key of PERMISSION_KEYS) {
      const section = p[key];
      if (!section) continue;
      const subject = ADMIN_SUBJECTS[key];
      if (READ_ONLY_SUBJECTS.has(subject)) {
        if (section.read) can("read", subject);
      } else {
        if (section.create) can("create", subject);
        if (section.read) can("read", subject);
        if (section.update) can("update", subject);
        if (section.delete) can("delete", subject);
      }
    }
  }

  return build();
}
