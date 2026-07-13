export function isSaudiRoute(pathname: string | null | undefined): boolean {
  return pathname === "/sa" || (pathname?.startsWith("/sa/") ?? false);
}

export function getSaudiBasePath(pathname: string | null | undefined): string {
  return isSaudiRoute(pathname) ? "/sa" : "";
}

export function stripSaudiPrefix(pathname: string): string {
  if (pathname === "/sa") return "/company";
  if (pathname.startsWith("/sa/")) return pathname.slice(3);
  return pathname;
}

export function withSaudiBase(path: string, basePath: string): string {
  return `${basePath}${path}`;
}

export function getCompanyLoginPath(pathname: string | null | undefined): string {
  const basePath = getSaudiBasePath(pathname);
  return basePath ? `${basePath}/company/login` : "/login";
}
