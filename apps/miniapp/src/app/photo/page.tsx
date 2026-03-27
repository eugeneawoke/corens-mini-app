import { Camera } from "lucide-react";
import { redirect } from "next/navigation";
import { AppSurface, NoticeCard, TopBar } from "@corens/ui";

import { AuthBootstrapScreen } from "../../components/auth-bootstrap";
import { BackendUnavailableScreen } from "../../components/backend-unavailable";
import {
  getProfileSummary,
  MiniAppBackendUnavailableError,
  MiniAppSessionRequiredError
} from "../../lib/api";

export default async function PhotoPage() {
  let profile;

  try {
    profile = await getProfileSummary();
  } catch (error) {
    if (error instanceof MiniAppSessionRequiredError) {
      return <AuthBootstrapScreen />;
    }
    if (error instanceof MiniAppBackendUnavailableError) {
      return <BackendUnavailableScreen />;
    }
    throw error;
  }

  if (!profile.onboardingCompleted) {
    redirect("/onboarding/intro");
  }

  return (
    <AppSurface>
      <TopBar title="Моё фото" backHref="/profile" />

      <NoticeCard
        icon={Camera}
        title="Фото пока отключено"
        description="Загрузку фото временно убрали из приложения. Позже вернём её в более зрелом виде."
      />
    </AppSurface>
  );
}
