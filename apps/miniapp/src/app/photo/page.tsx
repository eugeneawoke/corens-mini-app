import { Camera } from "lucide-react";
import { redirect } from "next/navigation";
import { AppSurface, NoticeCard, Panel, Section, TopBar } from "@corens/ui";

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

      <NoticeCard
        icon={Camera}
        title={photo.hasPhoto ? "Фото готово" : "Добавьте одно фото"}
        description={
          photo.hasPhoto
            ? "Фото хранится приватно и раскроется только после взаимного photo consent."
            : "Загрузите одно фото заранее, чтобы его можно было открыть после взаимного согласия."
        }
      />

      <Section title="Ваш снимок">
        <Panel className="corens-stack corens-gap-sm">
          <p className="corens-copy corens-copy-muted">{photo.statusCopy}</p>
          <PhotoManager summary={photo} />
        </Panel>
      </Section>
    </AppSurface>
  );
}
