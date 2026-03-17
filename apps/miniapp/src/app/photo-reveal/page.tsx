import { Camera, Lock } from "lucide-react";
import { redirect } from "next/navigation";
import { Button, ButtonLink, NoticeCard, StatusBadge } from "@corens/ui";

import { approveConsentAction, declineConsentAction } from "../actions";
import { AuthBootstrapScreen } from "../../components/auth-bootstrap";
import {
  getConsentStatus,
  getProfileSummary,
  MiniAppSessionRequiredError
} from "../../lib/api";

export default async function PhotoRevealPage() {
  let profile;
  let resolution;

  try {
    profile = await getProfileSummary();
    resolution = await getConsentStatus("photo");
  } catch (error) {
    if (error instanceof MiniAppSessionRequiredError) {
      return <AuthBootstrapScreen />;
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
          <span className="corens-eyebrow">Separate reveal</span>
          <h1 className="corens-section-title">Показать фото</h1>
          <p className="corens-copy corens-copy-muted">
            Фото раскрывается отдельно от контактов. Это независимый consent channel со своим статусом.
          </p>
          <div className="corens-status-lock">
            <Lock size={26} />
          </div>
        </div>

        <NoticeCard
          title="Состояние reveal"
          description="Пока один из участников не одобрит reveal, фото остается скрытым и визуально отделенным."
        />

        <div className="corens-action-stack" style={{ marginTop: 16 }}>
          <StatusBadge tone="warning">{resolution?.status ?? "pending"}</StatusBadge>
          <form action={approveConsentAction.bind(null, "photo")}>
            <Button>Запросить раскрытие</Button>
          </form>
          <form action={declineConsentAction.bind(null, "photo")}>
            <Button variant="danger">Не показывать</Button>
          </form>
          <ButtonLink href="/connection" variant="ghost">
            Вернуться к связи
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
