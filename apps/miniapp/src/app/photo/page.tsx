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
  // Fetch profile and photo status in parallel
  const [profileResult, photoResult] = await Promise.allSettled([
    getProfileSummary(),
    getPhotoSummary()
  ]);

  if (profileResult.status === "rejected" || photoResult.status === "rejected") {
    const failed = (profileResult.status === "rejected" ? profileResult : photoResult) as PromiseRejectedResult;
    const error = failed.reason;
    if (error instanceof MiniAppSessionRequiredError) {
      return <AuthBootstrapScreen />;
    }
    if (error instanceof MiniAppBackendUnavailableError) {
      return <BackendUnavailableScreen />;
    }
    throw error;
  }

  const profile = profileResult.value;
  const photo = photoResult.value;

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
          description="Фото хранится приватно и раскроется только после взаимного согласия."
        />
      )}

      <PhotoManager summary={photo} />
    </AppSurface>
  );
}
