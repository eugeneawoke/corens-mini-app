import { Shield } from "lucide-react";
import { redirect } from "next/navigation";
import { Button, ButtonLink, NoticeCard, StatusBadge } from "@corens/ui";

import { approveConsentAction, declineConsentAction } from "../actions";
import { AuthBootstrapScreen } from "../../components/auth-bootstrap";
import { BackendUnavailableScreen } from "../../components/backend-unavailable";
import {
  getConsentStatus,
  getProfileSummary,
  MiniAppBackendUnavailableError,
  MiniAppSessionRequiredError
} from "../../lib/api";

export default async function ContactConsentPage({
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

  try {
    profile = await getProfileSummary();
    resolution = await getConsentStatus("contact", connectionId);
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
            <Shield size={28} />
          </div>
          <span className="corens-eyebrow">Взаимное согласие</span>
          <h1 className="corens-section-title">Написать друг другу?</h1>
          <p className="corens-copy corens-copy-muted">
            Ссылка для общения откроется только после взаимного согласия. Ничего лишнего не передаётся.
          </p>
        </div>

        <NoticeCard
          title="Пока здесь"
          description={
            resolution?.warnings.includes("peer_deleted")
              ? "Другой человек удалил аккаунт. Эта связь закрыта, и написать уже не получится."
              : resolution?.warnings.includes("telegram_handoff_warning_required")
                ? "Прежде чем продолжить, убедитесь, что вы готовы к этому шагу."
                : "Ждём, пока другой человек примет решение."
          }
          tone={resolution?.warnings.includes("peer_deleted") ? "danger" : "warning"}
        />

        <div className="corens-action-stack" style={{ marginTop: 16 }}>
          <StatusBadge tone={resolution?.warnings.includes("peer_deleted") ? "danger" : "warning"}>
            {resolution?.status ?? "pending"}
          </StatusBadge>
          {resolution?.warnings.includes("peer_deleted") ? null : resolution?.status === "approved" && resolution.artifactValue ? (
            <ButtonLink href={resolution.artifactValue} variant="success">
              Открыть Telegram
            </ButtonLink>
          ) : (
            <>
              <form action={approveConsentAction.bind(null, "contact", connectionId)}>
                <Button variant="success">Да, хочу написать</Button>
              </form>
              <form action={declineConsentAction.bind(null, "contact", connectionId)}>
                <Button variant="danger">Пока нет</Button>
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
