const MAX_HISTORY = 80;

type SearchParamValue = string | number | string[] | undefined;
type NavigationMode = "push" | "replace" | "back" | "reset";

const PATIENT_ROOT_ROUTES = new Set([
  "/patient/dashboard",
  "/patient/chat-list",
  "/patient/reservation",
  "/patient/my-trips",
  "/patient/profile",
]);

const DOCTOR_ROOT_ROUTES = new Set([
  "/doctor/dashboard",
  "/doctor/chat-list",
  "/doctor/availability",
  "/doctor/schedule-patient",
  "/doctor/profile",
]);

let routeHistory: string[] = [];
let currentRouteKey = "/";
let currentPathname = "/";
let pendingMode: NavigationMode | null = null;

const getPathnameFromRouteKey = (routeKey: string): string => {
  const [pathname] = routeKey.split("?");
  return pathname || routeKey;
};

const normalizeRouteKey = (routeKey: string): string => {
  if (!routeKey) {
    return "/";
  }

  return routeKey.replace(/\/$/, "") || "/";
};

const isBlockedBackRoute = (routeKey: string): boolean => {
  const pathname = getPathnameFromRouteKey(routeKey);
  return pathname === "/" || pathname.startsWith("/auth");
};

export const buildRouteKey = (
  pathname: string,
  params: Record<string, SearchParamValue>
): string => {
  const search = new URLSearchParams();

  Object.entries(params)
    .sort(([left], [right]) => left.localeCompare(right))
    .forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") {
        return;
      }

      if (Array.isArray(value)) {
        value.forEach((entry) => {
          if (entry !== undefined && entry !== null && entry !== "") {
            search.append(key, String(entry));
          }
        });
        return;
      }

      search.append(key, String(value));
    });

  const query = search.toString();
  const normalizedPath = normalizeRouteKey(pathname);
  return query ? `${normalizedPath}?${query}` : normalizedPath;
};

export const markNavigationMode = (mode: NavigationMode): void => {
  pendingMode = mode;
};

export const resetNavigationHistory = (routeKey?: string): void => {
  if (!routeKey) {
    routeHistory = [];
    pendingMode = null;
    currentRouteKey = "/";
    currentPathname = "/";
    return;
  }

  const normalized = normalizeRouteKey(routeKey);
  routeHistory = [normalized];
  pendingMode = null;
  currentRouteKey = normalized;
  currentPathname = getPathnameFromRouteKey(normalized);
};

export const syncNavigationHistory = (routeKey: string, pathname: string): void => {
  const normalizedRouteKey = normalizeRouteKey(routeKey);
  currentRouteKey = normalizedRouteKey;
  currentPathname = normalizeRouteKey(pathname);

  switch (pendingMode) {
    case "replace":
      if (routeHistory.length === 0) {
        routeHistory = [normalizedRouteKey];
      } else {
        routeHistory[routeHistory.length - 1] = normalizedRouteKey;
      }
      break;
    case "back":
      if (routeHistory.length > 1) {
        routeHistory.pop();
      }
      if (routeHistory[routeHistory.length - 1] !== normalizedRouteKey) {
        routeHistory.push(normalizedRouteKey);
      }
      break;
    case "reset":
      routeHistory = [normalizedRouteKey];
      break;
    case "push":
    default:
      if (routeHistory[routeHistory.length - 1] !== normalizedRouteKey) {
        routeHistory.push(normalizedRouteKey);
      }
      break;
  }

  while (
    routeHistory.length > 1 &&
    routeHistory[routeHistory.length - 1] === routeHistory[routeHistory.length - 2]
  ) {
    routeHistory.pop();
  }

  if (routeHistory.length > MAX_HISTORY) {
    routeHistory = routeHistory.slice(-MAX_HISTORY);
  }

  pendingMode = null;
};

export const getDefaultFallbackRoute = (pathname: string): string | null => {
  if (pathname === "/auth/patient-create-account") {
    return "/auth/patient-login";
  }

  if (pathname === "/auth/doctor-create-account") {
    return "/auth/doctor-login";
  }

  if (pathname.startsWith("/auth")) {
    return "/auth/role-select";
  }

  if (pathname.startsWith("/patient/chat")) {
    return "/patient/chat-list";
  }

  if (
    pathname.startsWith("/patient/quote-detail") ||
    pathname.startsWith("/patient/quote-compare") ||
    pathname.startsWith("/patient/dentist-profile") ||
    pathname.startsWith("/patient/dentist-reviews")
  ) {
    return "/patient/quotes";
  }

  if (
    pathname.startsWith("/patient/arrival-info") ||
    pathname.startsWith("/patient/case-hub") ||
    pathname.startsWith("/patient/cancel-booking") ||
    pathname.startsWith("/patient/clinic-checkin") ||
    pathname.startsWith("/patient/departure-pickup") ||
    pathname.startsWith("/patient/final-payment") ||
    pathname.startsWith("/patient/hotel-arrived") ||
    pathname.startsWith("/patient/pickup-review") ||
    pathname.startsWith("/patient/stay-or-return") ||
    pathname.startsWith("/patient/treatment-complete") ||
    pathname.startsWith("/patient/visit-schedule")
  ) {
    return "/patient/reservation";
  }

  if (pathname.startsWith("/patient") && !PATIENT_ROOT_ROUTES.has(pathname)) {
    return "/patient/dashboard";
  }

  if (pathname.startsWith("/doctor/chat")) {
    return "/doctor/chat-list";
  }

  if (
    pathname.startsWith("/doctor/case-detail") ||
    pathname.startsWith("/doctor/final-invoice") ||
    pathname.startsWith("/doctor/patient-info") ||
    pathname.startsWith("/doctor/earnings") ||
    pathname.startsWith("/doctor/alerts") ||
    pathname.startsWith("/doctor/before-after")
  ) {
    return "/doctor/dashboard";
  }

  if (pathname.startsWith("/doctor") && !DOCTOR_ROOT_ROUTES.has(pathname)) {
    return "/doctor/dashboard";
  }

  return null;
};

export const getSafeBackTarget = (fallbackRoute?: string): string | null => {
  for (let index = routeHistory.length - 2; index >= 0; index -= 1) {
    const candidate = routeHistory[index];
    if (!candidate) {
      continue;
    }

    if (candidate !== currentRouteKey && !isBlockedBackRoute(candidate)) {
      return candidate;
    }
  }

  return fallbackRoute ?? getDefaultFallbackRoute(currentPathname);
};

export const isPatientRootRoute = (pathname: string): boolean => {
  return PATIENT_ROOT_ROUTES.has(normalizeRouteKey(pathname));
};

export const isDoctorRootRoute = (pathname: string): boolean => {
  return DOCTOR_ROOT_ROUTES.has(normalizeRouteKey(pathname));
};

export const getCurrentPathname = (): string => currentPathname;