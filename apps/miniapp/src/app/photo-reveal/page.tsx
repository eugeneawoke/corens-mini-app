import { Camera, Lock } from "lucide-react";
import { redirect } from "next/navigation";
import { Button, ButtonLink, NoticeCard, StatusBadge } from "@corens/ui";

import { approveConsentAction, declineConsentAction } from "../actions";
import { AuthBootstrapScreen } from "../../components/auth-bootstrap";
import { BackendUnavailableScreen } from "../../components/backend-unavailable";
import {
  getConsentStatus,
  getPhotoRevealSummary,
  getProfileSummary,
  MiniAppBackendUnavailableError,
  MiniAppSessionRequiredError
} from "../../lib/api";

export default async function PhotoRevealPage({
  searchParams
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id: connectionId } = await searchParams;

  if (!connectionId) {
    redirect("/connection");
  }

  let profile;
  let resolution;
  let reveal;

  try {
    profile = await getProfileSummary();
    resolution = await getConsentStatus("photo", connectionId);
    reveal = await getPhotoRevealSummary(connectionId);
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
    <div className="corens-sheet-layout">
      <div className="corens-sheet">
        <div className="corens-sheet-handle" />
        <div className="corens-sheet-copy">
          <div className="corens-sheet-icon">
            <Camera size={28} />
          </div>
          <span className="corens-eyebrow">Взаимный шаг</span>
          <h1 className="corens-section-title">Увидеть друг друга?</h1>
          <p className="corens-copy corens-copy-muted">
            Фотографии открываются только когда оба захотят. Это отдельный шаг — не связанный с контактами.
          </p>
          <div className="corens-status-lock">
            <Lock size={26} />
          </div>
        </div>

        <NoticeCard
          title="Пока здесь"
          description={
            resolution?.warnings.includes("peer_deleted")
              ? "Другой человек удалил аккаунт. Эта связь закрыта, поэтому фото больше недоступно."
              : reveal.state === "photo_missing"
                ? "Вы оба согласились, но у другого человека пока нет загруженного фото."
                : "Фото откроется только если вы оба нажмёте «да»."
          }
          tone={resolution?.warnings.includes("peer_deleted") ? "danger" : "warning"}
        />

        {reveal.state === "ready" && reveal.imageUrl ? (
          <img
            src={reveal.imageUrl}
            alt="Фото собеседника"
            style={{ width: "100%", borderRadius: 24, objectFit: "cover", marginTop: 16 }}
          />
        ) : null}

        <div className="corens-action-stack" style={{ marginTop: 16 }}>
          <StatusBadge tone={resolution?.warnings.includes("peer_deleted") ? "danger" : "warning"}>
            {resolution?.status ?? "pending"}
          </StatusBadge>
          {resolution?.warnings.includes("peer_deleted") ? null : (
            <>
              <form action={approveConsentAction.bind(null, "photo", connectionId)}>
                <Button>Да, хочу видеть</Button>
              </form>
              <form action={declineConsentAction.bind(null, "photo", connectionId)}>
                <Button variant="danger">Пока не хочу</Button>
              </form>
            </>
          )}
          <ButtonLink href={`/connection/${connectionId}`} variant="ghost">
            Вернуться
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
