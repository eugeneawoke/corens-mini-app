import { redirect } from "next/navigation";
import { AppSurface, Button, NoticeCard, Panel, TopBar } from "@corens/ui";

import { updateTrustKeysAction } from "../actions";
import { AuthBootstrapScreen } from "../../components/auth-bootstrap";
import { BackendUnavailableScreen } from "../../components/backend-unavailable";
import {
  getProfileSummary,
  MiniAppBackendUnavailableError,
  MiniAppSessionRequiredError
} from "../../lib/api";
import { TrustKeysSelector } from "../../components/trust-keys-selector";

export default async function TrustKeysPage() {
  let snapshot;

  try {
    snapshot = await getProfileSummary();
  } catch (error) {
    if (error instanceof MiniAppSessionRequiredError) {
      return <AuthBootstrapScreen />;
    }

    if (error instanceof MiniAppBackendUnavailableError) {
      return <BackendUnavailableScreen />;
    }

    throw error;
  }

  if (!snapshot.onboardingCompleted) {
    redirect("/onboarding");
  }

  return (
    <AppSurface>
      <TopBar title="Ключи доверия" backHref="/profile" />

      <form action={updateTrustKeysAction} className="corens-stack corens-gap-sm">
        <Panel>
          <TrustKeysSelector
            groups={snapshot.trustKeys.groups}
            selected={snapshot.trustKeys.selected}
          />
        </Panel>

        <NoticeCard
          title={snapshot.trustKeys.isOnCooldown ? "Пауза между изменениями" : "Ключи доверия"}
          description={snapshot.trustKeys.cooldownLabel}
          tone={snapshot.trustKeys.isOnCooldown ? "warning" : "default"}
        />

        <Button type="submit" disabled={snapshot.trustKeys.isOnCooldown}>Сохранить</Button>
      </form>
    </AppSurface>
  );
}
