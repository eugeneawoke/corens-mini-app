import { redirect } from "next/navigation";
import { AppSurface, ButtonLink, Panel, TopBar } from "@corens/ui";

import { AuthBootstrapScreen } from "../../../components/auth-bootstrap";
import { BackendUnavailableScreen } from "../../../components/backend-unavailable";
import { BeaconHero } from "../../../components/beacon-hero";
import {
  getBeaconSummary,
  getProfileSummary,
  MiniAppBackendUnavailableError,
  MiniAppSessionRequiredError
} from "../../../lib/api";

export default async function BeaconAboutPage() {
  const [profileResult, beaconResult] = await Promise.allSettled([
    getProfileSummary(),
    getBeaconSummary()
  ]);

  if (profileResult.status === "rejected" || beaconResult.status === "rejected") {
    const failed = (profileResult.status === "rejected" ? profileResult : beaconResult) as PromiseRejectedResult;
    const error = failed.reason;

    if (error instanceof MiniAppSessionRequiredError) {
      return <AuthBootstrapScreen />;
    }

    if (error instanceof MiniAppBackendUnavailableError) {
      return <BackendUnavailableScreen />;
    }

    throw error;
  }

  if (!profileResult.value.onboardingCompleted) {
    redirect("/onboarding/intro");
  }

  const beacon = beaconResult.value;

  return (
    <AppSurface bottomBar={<ButtonLink href="/beacon" variant="beacon">Перейти к маяку</ButtonLink>}>
      <TopBar title="Маяк" backHref="/connection" />

      <Panel className="corens-stack corens-gap-sm corens-beacon-about">
        <BeaconHero active={beacon.status === "active"} size={76} />
        <div className="corens-stack corens-gap-xs" style={{ textAlign: "center" }}>
          <span className="corens-eyebrow">Небольшой шаг навстречу</span>
          <h2 className="corens-section-title">Маяк помогает стать заметнее</h2>
          <p className="corens-copy corens-copy-muted">
            Когда хочется, чтобы знакомство случилось чуть быстрее, можно на время включить маяк.
            Тогда люди с близким состоянием и похожими ключами доверия увидят вас раньше других.
          </p>
          <p className="corens-copy corens-copy-muted">
            Всё остаётся бережно и спокойно: маяк лишь помогает поиску, но ничего не открывает без вашего выбора.
          </p>
        </div>
      </Panel>
    </AppSurface>
  );
}
