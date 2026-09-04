import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const onboardingSource = readFileSync(
  new URL("../../apps/miniapp/src/app/onboarding/page.tsx", import.meta.url),
  "utf8"
);

const formActionsSource = readFileSync(
  new URL("../../apps/miniapp/src/components/onboarding-form-actions.tsx", import.meta.url),
  "utf8"
);

const intentSelectorUrl = new URL(
  "../../apps/miniapp/src/components/onboarding-intent-selector.tsx",
  import.meta.url
);
const intentSelectorSource = existsSync(intentSelectorUrl)
  ? readFileSync(intentSelectorUrl, "utf8")
  : "";

const globalsSource = readFileSync(
  new URL("../../apps/miniapp/src/app/globals.css", import.meta.url),
  "utf8"
);

describe("structured single-page onboarding", () => {
  it("presents the four form sections in conversation-first order", () => {
    const intent = onboardingSource.indexOf('data-onboarding-section="intent"');
    const state = onboardingSource.indexOf('data-onboarding-section="state"');
    const trust = formActionsSource.indexOf('data-onboarding-section="trust"');
    const identity = formActionsSource.indexOf('data-onboarding-section="identity"');

    expect(intent).toBeGreaterThan(-1);
    expect(state).toBeGreaterThan(intent);
    expect(trust).toBeGreaterThan(-1);
    expect(identity).toBeGreaterThan(trust);
  });

  it("labels optional and required sections instead of hiding the rules", () => {
    expect(onboardingSource).toContain('data-requirement="optional"');
    expect(onboardingSource).toContain('data-requirement="required"');
    expect(formActionsSource).toContain("Выберите от 1 до 3");
    expect(formActionsSource).toContain("Выберите от 1 до 2");
  });

  it("shows all states as one neutral choice field", () => {
    expect(onboardingSource).not.toMatch(/splitStateOptions|lightStateKeys|shadowStateKeys/);
    expect(onboardingSource).not.toMatch(/Светлые состояния|Теневые состояния/);
    expect(onboardingSource).toContain("<OnboardingStateSelector");
    expect(onboardingSource).not.toContain("snapshot.state.options.map");
    expect(onboardingSource.replace(/\s+/g, " ")).toContain(
      "Здесь нет правильного или неправильного состояния"
    );
  });

  it("uses one button-controlled card flow without an introductory section map", () => {
    expect(onboardingSource).not.toContain("corens-onboarding-map");
    expect(onboardingSource).not.toContain("Четыре понятных блока на одной странице");
    expect(onboardingSource).toContain("intentSection={intentSection}");
    expect(onboardingSource).toContain("stateSection={stateSection}");
    expect(formActionsSource).toContain("const [currentStep, setCurrentStep]");
    expect(formActionsSource).toContain('aria-label="Назад"');
    expect(formActionsSource).toContain('aria-label="Дальше"');
    expect(formActionsSource).toContain("currentStep === ONBOARDING_STEP_COUNT - 1");
    expect(formActionsSource).toContain('data-onboarding-step-active="true"');
  });

  it("keeps required steps gated while the conversation step remains optional", () => {
    expect(formActionsSource).toContain("currentStep === 0 || currentStep === 1");
    expect(formActionsSource).toContain("currentStep === 2 ? isTrustValid : isIdentityValid");
    expect(formActionsSource).toContain("disabled={!canContinue}");
  });

  it("keeps a moderation error beside the editable display-name field", () => {
    expect(onboardingSource).not.toContain("<form action={completeOnboardingAction}");
    expect(formActionsSource).toContain("useActionState(completeOnboardingAction");
    expect(formActionsSource).toContain('aria-describedby="display-name-content-error"');
    expect(formActionsSource).toContain('id="display-name-content-error"');
    expect(formActionsSource).toContain("Задать вопрос поддержке");
  });

  it("does not use matching jargon in onboarding-facing copy", () => {
    expect(onboardingSource).not.toMatch(/матчинг/i);
    expect(formActionsSource).not.toMatch(/матчинг/i);
  });

  it("keeps the conversation card compact and explains only the selected option", () => {
    expect(onboardingSource).toContain("<OnboardingIntentSelector");
    expect(onboardingSource).not.toContain("snapshot.intent.options.map");
    expect(intentSelectorSource).toContain('className="corens-onboarding-intent-cloud"');
    expect(intentSelectorSource).toContain('className="corens-onboarding-intent-readout"');
    expect(intentSelectorSource).toContain('aria-live="polite"');
  });

  it("uses the viewport as the onboarding frame with an overflow fallback", () => {
    expect(globalsSource).toContain(".corens-page:has(.corens-onboarding-flow)");
    expect(globalsSource).toContain("height: 100dvh");
    expect(globalsSource).toContain("overflow: hidden");
    expect(globalsSource).toContain("overflow-y: auto");
  });
});
