"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Car, Calendar, Smartphone, UserPlus, Sparkles } from "lucide-react";
import { apiClient } from "../../lib/services/api-client";
import { useAuth } from "../../lib/contexts/auth-context";

const STEPS = [
  {
    id: "welcome",
    title: "Welcome to your Traflinq trial",
    body: "You have 72 hours to explore pool car management. In three quick steps you’ll add a vehicle, invite a driver, and create your first booking.",
    icon: Sparkles,
    cta: "Next",
    href: null as string | null,
  },
  {
    id: "vehicle",
    title: "Step 1 — Add a pool vehicle",
    body: "Go to Pool Fleet and register a company vehicle. This is the car your driver will use for self-managed bookings.",
    icon: Car,
    cta: "Go to Pool Fleet → Vehicles",
    href: "/company/fleet?tab=vehicles",
    showNext: true,
  },
  {
    id: "driver",
    title: "Step 2 — Invite a pool driver",
    body: "Add a driver and set their password. They’ll use those credentials to sign in to the Traflinq chauffeur app on their phone.",
    icon: UserPlus,
    cta: "Go to Pool Fleet → Drivers",
    href: "/company/fleet?tab=drivers",
    showNext: true,
  },
  {
    id: "booking",
    title: "Step 3 — Create a booking",
    body: "Create a self-managed chauffeur booking using your pool vehicle and driver. Your seeded employee profile is ready as the passenger.",
    icon: Calendar,
    cta: "Create a booking",
    href: "/company/bookings?action=new",
    showNext: true,
  },
  {
    id: "app",
    title: "Try the Traflinq mobile app",
    body: "Drivers can accept and run trips from the chauffeur app. Employees can track rides from the employee app — use the mobile credentials from your welcome email.",
    icon: Smartphone,
    cta: "Get started",
    href: null,
  },
] as const;

function getAppStoreUrl(): string | null {
  return process.env.NEXT_PUBLIC_APP_STORE_URL || null;
}

function getPlayStoreUrl(): string | null {
  return process.env.NEXT_PUBLIC_PLAY_STORE_URL || null;
}

type TrialOnboardingWalkthroughProps = {
  forceOpen?: boolean;
  onClose?: () => void;
};

export function TrialOnboardingWalkthrough({ forceOpen = false, onClose }: TrialOnboardingWalkthroughProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, markTrialOnboardingComplete } = useAuth();
  const [stepIndex, setStepIndex] = useState(0);
  const [completing, setCompleting] = useState(false);

  const shouldShow =
    forceOpen ||
    searchParams.get("walkthrough") === "1" ||
    (user?.is_trial && !user.trial_onboarding_completed);

  const step = STEPS[stepIndex];
  const StepIcon = step.icon;
  const isLast = stepIndex === STEPS.length - 1;

  const appStoreUrl = useMemo(() => getAppStoreUrl(), []);
  const playStoreUrl = useMemo(() => getPlayStoreUrl(), []);

  const finish = useCallback(async () => {
    setCompleting(true);
    try {
      await apiClient.completeTrialOnboarding();
      markTrialOnboardingComplete();
      onClose?.();
      if (searchParams.get("walkthrough") === "1") {
        router.replace("/company");
      }
    } catch {
      markTrialOnboardingComplete();
      onClose?.();
    } finally {
      setCompleting(false);
    }
  }, [markTrialOnboardingComplete, onClose, router, searchParams]);

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

  if (!shouldShow) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-[#0f172a] p-8 shadow-2xl text-white">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="text-xs font-bold uppercase tracking-widest text-[#f47f00]">
            Trial setup · {stepIndex + 1} / {STEPS.length}
          </div>
          {!forceOpen && stepIndex > 0 && (
            <button
              type="button"
              onClick={handleSkip}
              className="text-xs text-white/40 hover:text-white/70 transition-colors"
            >
              Skip for now
            </button>
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
            {"showNext" in step && step.showNext && (
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
