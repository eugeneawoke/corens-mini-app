import { Camera } from "lucide-react";
import { redirect } from "next/navigation";
import { AppSurface, NoticeCard, TopBar } from "@corens/ui";

import { AuthBootstrapScreen } from "../../components/auth-bootstrap";
import { BackendUnavailableScreen } from "../../components/backend-unavailable";
import { PhotoManager } from "../../components/photo-manager";
import {
  getPhotoSummary,
  getProfileSummary,
  MiniAppBackendUnavailableError,
  MiniAppSessionRequiredError
} from "../../lib/api";

export default async function PhotoPage() {
  let profile;
  let photo;

  try {
    profile = await getProfileSummary();
    photo = await getPhotoSummary();
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
    redirect("/onboarding");
  }

  return (
    <AppSurface>
      <TopBar title="Моё фото" backHref="/profile" />

      {photo.hasPhoto && (
        <NoticeCard
          icon={Camera}
          title="Фото готово"
          description="Фото хранится приватно и раскроется только после взаимного photo consent."
        />
      )}

      <PhotoManager summary={photo} />
    </AppSurface>
  );
}
