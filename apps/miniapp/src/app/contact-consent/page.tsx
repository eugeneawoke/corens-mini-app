import { Shield } from "lucide-react";
import { redirect } from "next/navigation";
import { Button, ButtonLink, NoticeCard, StatusBadge } from "@corens/ui";

import { approveConsentAction } from "../actions";
import { getConsentStatus, getProfileSummary } from "../../lib/api";

export default async function ContactConsentPage() {
  const profile = await getProfileSummary();

  if (!profile.onboardingCompleted) {
    redirect("/onboarding");
  }

  const resolution = await getConsentStatus("contact");

  return (
    <div className="corens-sheet-layout">
      <div className="corens-sheet">
        <div className="corens-sheet-handle" />
        <div className="corens-sheet-copy">
          <div className="corens-sheet-icon">
            <Shield size={28} />
          </div>
          <span className="corens-eyebrow">Mutual consent</span>
          <h1 className="corens-section-title">Обмен контактами</h1>
          <p className="corens-copy corens-copy-muted">
            Контакты открываются только при взаимном согласии, а артефакт остается Telegram deep link, а не plain-text поле.
          </p>
        </div>

        <NoticeCard
          title="Текущий статус"
          description={
            resolution?.warnings.includes("telegram_handoff_warning_required")
              ? "Backend policy требует мягкое предупреждение перед открытием контакта."
              : "Ожидается действие второго участника."
          }
          tone="warning"
        />

        <div className="corens-action-stack" style={{ marginTop: 16 }}>
          <StatusBadge tone="warning">{resolution?.status ?? "pending"}</StatusBadge>
          <form action={approveConsentAction.bind(null, "contact")}>
            <Button variant="success">Разрешить обмен</Button>
          </form>
          <ButtonLink href="/connection" variant="ghost">
            Не сейчас
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
