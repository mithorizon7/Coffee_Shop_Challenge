export interface LearnerOnboardingState {
  firstRunChecklistDismissed: boolean;
  inSessionGuidanceDismissed: boolean;
  firstSuccessCompleted: boolean;
}

const ONBOARDING_STORAGE_KEY = "coffee-shop-challenge.onboarding.v1";

const defaultOnboardingState: LearnerOnboardingState = {
  firstRunChecklistDismissed: false,
  inSessionGuidanceDismissed: false,
  firstSuccessCompleted: false,
};

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function normalizeState(
  value: Partial<LearnerOnboardingState> | null | undefined
): LearnerOnboardingState {
  if (!value) return { ...defaultOnboardingState };
  return {
    firstRunChecklistDismissed: value.firstRunChecklistDismissed ?? false,
    inSessionGuidanceDismissed: value.inSessionGuidanceDismissed ?? false,
    firstSuccessCompleted: value.firstSuccessCompleted ?? false,
  };
}

export function readLearnerOnboardingState(): LearnerOnboardingState {
  if (!isBrowser()) return { ...defaultOnboardingState };

  try {
    const rawState = window.localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (!rawState) return { ...defaultOnboardingState };
    const parsed = JSON.parse(rawState) as Partial<LearnerOnboardingState>;
    return normalizeState(parsed);
  } catch {
    return { ...defaultOnboardingState };
  }
}

export function updateLearnerOnboardingState(
  updates: Partial<LearnerOnboardingState>
): LearnerOnboardingState {
  const nextState = {
    ...readLearnerOnboardingState(),
    ...updates,
  };

  if (isBrowser()) {
    try {
      window.localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(nextState));
    } catch {
      // Ignore localStorage write failures; app behavior remains functional.
    }
  }

  return nextState;
}
