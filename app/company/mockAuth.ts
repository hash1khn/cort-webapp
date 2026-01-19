// Mock authentication for company admin
// In real app, this would use company email/password from the company record

export function setCompanyAuth(companyId: string | null) {
  if (typeof window === "undefined") return;
  if (companyId) {
    window.localStorage.setItem("cort.company.authed", companyId);
  } else {
    window.localStorage.removeItem("cort.company.authed");
  }
}

export function getCompanyAuth(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("cort.company.authed");
}

