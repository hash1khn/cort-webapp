export const MOCK_ADMIN_EMAIL = "admin@cort.local";
export const MOCK_ADMIN_PASSWORD = "admin123";

export function setMockAuth(isAuthed: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("cort.admin.authed", isAuthed ? "1" : "0");
}

export function getMockAuth() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem("cort.admin.authed") === "1";
}


