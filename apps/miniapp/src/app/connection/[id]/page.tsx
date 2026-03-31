import { ExternalLink, Shield, Unlink2 } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  AppSurface,
  Button,
  ButtonLink,
  Panel,
  Section,
  StatusBadge,
  TopBar
} from "@corens/ui";

import { closeConnectionAction } from "../../actions";
import { LockStatusHint } from "../../../components/lock-status-hint";
import { AuthBootstrapScreen } from "../../../components/auth-bootstrap";
import { BackendUnavailableScreen } from "../../../components/backend-unavailable";
import {
  getConnectionById,
  getProfileSummary,
  MiniAppBackendUnavailableError,
  MiniAppSessionRequiredError
} from "../../../lib/api";

function toneForStatus(status: "pending" | "approved" | "declined") {
  if (status === "approved") return "success" as const;
  if (status === "declined") return "danger" as const;
  return "warning" as const;
}

function statusLabel(status: "pending" | "approved" | "declined"): string | null {
  if (status === "approved") return "Открыто";
  if (status === "declined") return "Отказано";
  return null;
}

export default async function ConnectionDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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

  let connection;

  try {
    connection = await getConnectionById(id);
  } catch (error) {
    if (error instanceof MiniAppSessionRequiredError) {
      return <AuthBootstrapScreen />;
    }
    if (error instanceof MiniAppBackendUnavailableError) {
      return <BackendUnavailableScreen />;
    }
    throw error;
  }

  if (!connection) {
    notFound();
  }

  if (connection.kind === "peer_deleted") {
    return (
      <AppSurface
        bottomBar={
          <ButtonLink href="/connection" variant="beacon">
            {connection.primaryActionLabel}
          </ButtonLink>
        }
      >
        <TopBar
          title="Ваша связь"
          action={
            <Link className="corens-icon-button" href="/connection" aria-label="Назад">
              ←
            </Link>
          }
        />

        <Panel className="corens-stack corens-gap-sm">
          <span className="corens-eyebrow">Системное сообщение</span>
          <h2 className="corens-section-title">{connection.title}</h2>
          <p className="corens-copy corens-copy-muted">{connection.description}</p>
        </Panel>

        <Section title="Что произошло">
          <Panel tone="warning">
            <div className="corens-stack corens-gap-sm">
              <div className="corens-inline-head">
                <Unlink2 size={18} />
                <strong className="corens-card-title">Связь закрыта</strong>
              </div>
              <p className="corens-copy corens-copy-muted">{connection.statusCopy}</p>
              <ButtonLink href="/connection" variant="secondary">
                {connection.primaryActionLabel}
              </ButtonLink>
            </div>
          </Panel>
        </Section>
      </AppSurface>
    );
  }

  return (
    <AppSurface>
      <TopBar
        title="Связь"
        backHref="/connection"
      />

      <Panel className="corens-stack corens-gap-sm">
        <div className="corens-row corens-row-between">
          <div className="corens-stack corens-gap-xs">
            <span className="corens-eyebrow">О человеке рядом</span>
            <h2 className="corens-section-title">{connection.displayName}</h2>
            <p className="corens-copy corens-copy-muted">
              Способ связаться откроется только если вы оба захотите.
            </p>
          </div>
          <LockStatusHint
            anyConsentApproved={connection.contactConsent.status === "approved"}
          />
        </div>
        <div className="corens-chip-row">
          {connection.sharedKeys.map((key) => (
            <StatusBadge key={key} tone="accent">
              {key}
            </StatusBadge>
          ))}
        </div>
      </Panel>

      <Section title="Почему вы рядом">
        <Panel>
          <div className="corens-stack corens-gap-sm">
            <div>
              <h3 className="corens-card-title">Общее между вами</h3>
              <p className="corens-copy corens-copy-muted">{connection.sharedState}</p>
            </div>
            <p className="corens-copy corens-copy-muted">{connection.statusCopy}</p>
          </div>
        </Panel>
      </Section>

      <Section title="Открыться навстречу">
        <Panel>
          <div className="corens-stack corens-gap-sm">
            <div className="corens-row corens-row-between">
              <div className="corens-inline-head">
                <Shield size={18} />
                <div className="corens-stack corens-gap-xs">
                  <strong className="corens-card-title">Способ связаться</strong>
                  <span className="corens-list-description">
                    {connection.contactConsent.status === "approved"
                      ? "Оба согласились — можно написать напрямую."
                      : connection.contactConsent.myDecision === "pending" &&
                          connection.contactConsent.peerRequested
                        ? "Этот человек уже готов открыть контакт. Если хотите, можно ответить сейчас."
                      : connection.contactConsent.myDecision === "approved"
                        ? "Вы согласились. Ждём ответа другого человека."
                        : "Ссылка для общения откроется только после взаимного согласия."}
                  </span>
                </div>
              </div>
              {statusLabel(connection.contactConsent.status) && (
                <StatusBadge tone={toneForStatus(connection.contactConsent.status)}>
                  {statusLabel(connection.contactConsent.status)}
                </StatusBadge>
              )}
            </div>
            {connection.contactConsent.status === "approved" && connection.contactConsent.artifactValue ? (
              <ButtonLink href={connection.contactConsent.artifactValue} variant="success">
                <ExternalLink size={16} />
                Написать в Telegram
              </ButtonLink>
            ) : connection.contactConsent.myDecision === "approved" ? (
              <StatusBadge tone="warning">Ждём ответа</StatusBadge>
            ) : (
              <ButtonLink href={`/contact-consent?id=${id}`} variant="secondary">
                {connection.contactConsent.peerRequested ? "Ответить" : "Обменяться контактами"}
              </ButtonLink>
            )}
          </div>
        </Panel>
      </Section>

      <Section title="Если хочется отпустить эту связь">
        <Panel tone="warning">
          <div className="corens-stack corens-gap-sm">
            <p className="corens-copy corens-copy-muted">
              После этого связь прервётся, и этот человек не появится у вас снова в ближайшие 72 часа.
            </p>
            <form action={closeConnectionAction.bind(null, id)}>
              <Button type="submit" variant="secondary" className="corens-button-outline-warm">
                Прервать связь
              </Button>
            </form>
            <ButtonLink
              href={`/connection/${id}/safety`}
              variant="ghost"
              className="corens-button-ghost-danger"
            >
              Пожаловаться или заблокировать
            </ButtonLink>
          </div>
        </Panel>
      </Section>
    </AppSurface>
  );
}
