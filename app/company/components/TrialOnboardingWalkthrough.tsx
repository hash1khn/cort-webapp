"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Bus, Car, Calendar, Map, Smartphone, UserPlus, Users, Sparkles, Play } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { apiClient } from "../../lib/services/api-client";
import { useAuth } from "../../lib/contexts/auth-context";
import type { TrialModules } from "../../lib/types/auth-types";

type WalkthroughStep = {
  id: string;
  title: string;
  body: string;
  icon: LucideIcon;
  cta: string;
  href: string | null;
  showNext?: boolean;
};

function poolSteps(): WalkthroughStep[] {
  return [
    {
      id: "pool-welcome",
      title: "Pool trial — chauffeur bookings",
      body: "Add a vehicle and chauffeur driver to your fleet, then assign them when you create a booking.",
      icon: Car,
      cta: "Next",
      href: null,
    },
    {
      id: "pool-vehicle",
      title: "Add a fleet vehicle",
      body: "Register a company vehicle in Fleet. Assign it when creating a self-managed chauffeur booking.",
      icon: Car,
      cta: "Go to Fleet → Vehicles",
      href: "/company/fleet?tab=vehicles",
      showNext: true,
    },
    {
      id: "pool-driver",
      title: "Invite a chauffeur driver",
      body: "Add a chauffeur-type driver to your fleet for bookings.",
      icon: UserPlus,
      cta: "Go to Fleet → Drivers",
      href: "/company/fleet?tab=drivers",
      showNext: true,
    },
    {
      id: "pool-booking",
      title: "Create a booking",
      body: "Create a self-managed chauffeur booking using your pool vehicle and driver. Add employees first if you need passengers other than yourself.",
      icon: Calendar,
      cta: "Create a booking",
      href: "/company/bookings?action=new",
      showNext: true,
    },
  ];
}

function shuttleSteps(): WalkthroughStep[] {
  return [
    {
      id: "shuttle-welcome",
      title: "Shuttle trial — routes & employees",
      body: "Use your company fleet: add a vehicle and shuttle driver, then assign them when you create a route.",
      icon: Bus,
      cta: "Next",
      href: null,
    },
    {
      id: "shuttle-vehicle",
      title: "Add a fleet vehicle",
      body: "Register a company vehicle with seat capacity. You will assign it to a shuttle route later.",
      icon: Bus,
      cta: "Go to Fleet → Vehicles",
      href: "/company/fleet?tab=vehicles",
      showNext: true,
    },
    {
      id: "shuttle-driver",
      title: "Invite a shuttle driver",
      body: "Add a shuttle-type driver to your fleet. They use these credentials in the driver mobile app.",
      icon: UserPlus,
      cta: "Go to Fleet → Drivers",
      href: "/company/fleet?tab=drivers",
      showNext: true,
    },
    {
      id: "shuttle-route",
      title: "Create a route",
      body: "Build a route with at least two stops and assign your shuttle vehicle and driver.",
      icon: Map,
      cta: "Create a route",
      href: "/company/routes/create",
      showNext: true,
    },
    {
      id: "shuttle-employees",
      title: "Add & assign employees",
      body: "Create up to 3 employees (6 if you selected both modules), then assign them to your route from the Routes page.",
      icon: Users,
      cta: "Go to Routes → Add Employee",
      href: "/company/routes",
      showNext: true,
    },
    {
      id: "shuttle-test",
      title: "Generate trips & test",
      body: "Open your route to track trips. Generate scheduled trips for today, then test with the driver and employee apps.",
      icon: Play,
      cta: "View routes",
      href: "/company/routes",
      showNext: true,
    },
  ];
}

function buildSteps(modules?: TrialModules): WalkthroughStep[] {
  const m = modules ?? "pool";
  const steps: WalkthroughStep[] = [
    {
      id: "welcome",
      title: "Welcome to your Traflinq trial",
      body:
        m === "both"
          ? "You have 72 hours to explore pool chauffeur and shuttle commute. We'll guide you through both modules."
          : m === "shuttle"
            ? "You have 72 hours to explore shuttle routes and employee commute."
            : "You have 72 hours to explore pool car management and chauffeur bookings.",
      icon: Sparkles,
      cta: "Let's go",
      href: null,
    },
  ];

  if (m === "pool" || m === "both") {
    if (m === "both") {
      steps.push({
        id: "section-pool",
        title: "Part 1 — Pool (chauffeur)",
        body: "Start with pool fleet and bookings.",
        icon: Car,
        cta: "Next",
        href: null,
      });
    }
    steps.push(...poolSteps());
  }

  if (m === "shuttle" || m === "both") {
    if (m === "both") {
      steps.push({
        id: "section-shuttle",
        title: "Part 2 — Shuttle",
        body: "Now set up shuttle fleet, routes, and employee assignments.",
        icon: Bus,
        cta: "Next",
        href: null,
      });
    }
    steps.push(...shuttleSteps());
  }

  steps.push({
    id: "app",
    title: "Mobile apps",
    body: "Drivers use the chauffeur/shuttle driver app with credentials from the invite step. Employees use the employee app with credentials shown when you create each employee.",
    icon: Smartphone,
    cta: "Get started",
    href: null,
  });

  return steps;
}

function getAppStoreUrl(): string | null {
  return process.env.NEXT_PUBLIC_APP_STORE_URL || null;
}

function getPlayStoreUrl(): string | null {
  return process.env.NEXT_PUBLIC_PLAY_STORE_URL || null;
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type TrialOnboardingWalkthroughProps = {
  forceOpen?: boolean;
  onClose?: () => void;
  sidebarCollapsed?: boolean;
};

export function TrialOnboardingWalkthrough({
  forceOpen = false,
  onClose,
  sidebarCollapsed = false,
}: TrialOnboardingWalkthroughProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, markTrialOnboardingComplete } = useAuth();
  const [stepIndex, setStepIndex] = useState(0);
  const [completing, setCompleting] = useState(false);

  const STEPS = useMemo(() => buildSteps(user?.trial_modules), [user?.trial_modules]);

  const manuallyOpened = forceOpen || searchParams.get("walkthrough") === "1";

  const shouldShow =
    manuallyOpened ||
    (user?.is_trial && !user.trial_onboarding_completed && pathname === "/company");

  const step = STEPS[stepIndex];
  const StepIcon = step.icon;
  const isLast = stepIndex === STEPS.length - 1;

  const appStoreUrl = useMemo(() => getAppStoreUrl(), []);
  const playStoreUrl = useMemo(() => getPlayStoreUrl(), []);

  const clearWalkthroughQuery = useCallback(() => {
    if (searchParams.get("walkthrough") !== "1") return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete("walkthrough");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }, [pathname, router, searchParams]);

  const dismiss = useCallback(() => {
    onClose?.();
    clearWalkthroughQuery();
  }, [clearWalkthroughQuery, onClose]);

  const finish = useCallback(async () => {
    setCompleting(true);
    try {
      await apiClient.completeTrialOnboarding();
      markTrialOnboardingComplete();
      onClose?.();
      clearWalkthroughQuery();
    } catch {
      markTrialOnboardingComplete();
      onClose?.();
      clearWalkthroughQuery();
    } finally {
      setCompleting(false);
    }
  }, [clearWalkthroughQuery, markTrialOnboardingComplete, onClose]);

  const handleNext = () => {
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  };

  const handlePrimary = async () => {
    if (isLast) {
      await finish();
      return;
    }
    if (step.href) {
      router.push(step.href);
      return;
    }
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  };

  const handleSkip = async () => {
    await finish();
  };

  useEffect(() => {
    if (!shouldShow) return;
    const main = document.querySelector("[data-company-main]");
    if (!(main instanceof HTMLElement)) return;
    const previousOverflow = main.style.overflow;
    main.style.overflow = "hidden";
    return () => {
      main.style.overflow = previousOverflow;
    };
  }, [shouldShow]);

  if (!shouldShow) return null;

  return (
    <div
      className={cx(
        "fixed top-0 right-0 bottom-0 z-[100] flex items-center justify-center bg-black/70 px-4 py-8 backdrop-blur-sm",
        "left-0",
        sidebarCollapsed ? "md:left-[6rem]" : "md:left-[19rem]",
      )}
    >
      <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-[#0f172a] p-8 shadow-2xl text-white">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="text-xs font-bold uppercase tracking-widest text-[#f47f00]">
            Trial setup · {stepIndex + 1} / {STEPS.length}
          </div>
          {manuallyOpened ? (
            <button
              type="button"
              onClick={dismiss}
              className="text-xs text-white/40 hover:text-white/70 transition-colors"
            >
              Close
            </button>
          ) : (
            !forceOpen &&
            stepIndex > 0 && (
              <button
                type="button"
                onClick={handleSkip}
                className="text-xs text-white/40 hover:text-white/70 transition-colors"
              >
                Skip for now
              </button>
            )
          )}
        </div>

        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f47f00]/15 text-[#f47f00] mb-5">
          <StepIcon size={24} />
        </div>

        <h2 className="text-2xl font-bold tracking-tight">{step.title}</h2>
        <p className="mt-3 text-sm leading-relaxed text-white/60">{step.body}</p>

        {step.id === "app" && (appStoreUrl || playStoreUrl) && (
          <div className="mt-5 flex flex-wrap gap-3">
            {appStoreUrl && (
              <Link
                href={appStoreUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-white/10 px-4 py-2 text-xs font-semibold text-white/80 hover:bg-white/5"
              >
                App Store
              </Link>
            )}
            {playStoreUrl && (
              <Link
                href={playStoreUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-white/10 px-4 py-2 text-xs font-semibold text-white/80 hover:bg-white/5"
              >
                Google Play
              </Link>
            )}
          </div>
        )}

        <div className="mt-8 flex items-center gap-3">
          {stepIndex > 0 && (
            <button
              type="button"
              onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
              className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-white/70 hover:bg-white/5"
            >
              Back
            </button>
          )}
          <div className="ml-auto flex items-center gap-3">
            {step.showNext && (
              <button
                type="button"
                onClick={handleNext}
                disabled={completing}
                className="rounded-xl border border-white/10 px-5 py-2.5 text-sm font-semibold text-white/80 hover:bg-white/5 disabled:opacity-60"
              >
                Next
              </button>
            )}
            <button
              type="button"
              onClick={handlePrimary}
              disabled={completing}
              className="rounded-xl bg-[#f47f00] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#f47f00]/90 disabled:opacity-60"
            >
              {completing ? "Saving…" : step.cta}
            </button>
          </div>
        </div>

        <div className="mt-6 flex gap-2">
          {STEPS.map((s, i) => (
            <div
              key={s.id}
              className={`h-1.5 flex-1 rounded-full transition-colors ${i <= stepIndex ? "bg-[#f47f00]" : "bg-white/10"}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
