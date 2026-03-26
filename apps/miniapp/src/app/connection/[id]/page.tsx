import { Camera, ExternalLink, Lock, Shield, Unlink2 } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import {
  AppSurface,
  Button,
  ButtonLink,
  Field,
  Panel,
  Section,
  StatusBadge,
  TopBar
} from "@corens/ui";

import { blockConnectionAction, reportConnectionAction } from "../../actions";
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
    redirect("/onboarding");
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
            <a className="corens-icon-button" href="/connection" aria-label="Назад">
              ←
            </a>
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
              Фото и способ связаться откроются только если вы оба захотите.
            </p>
          </div>
          <div className="corens-status-lock">
            <Lock size={30} />
          </div>
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
            <div className="corens-row corens-row-between">
              <div>
                <h3 className="corens-card-title">Общее между вами</h3>
                <p className="corens-copy corens-copy-muted">{connection.sharedState}</p>
              </div>
              <StatusBadge tone="success">Созвучность: {connection.matchScore}</StatusBadge>
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
                Обменяться контактами
              </ButtonLink>
            )}
          </div>
        </Panel>

        <Panel>
          <div className="corens-stack corens-gap-sm">
            <div className="corens-row corens-row-between">
              <div className="corens-inline-head">
                <Camera size={18} />
                <div className="corens-stack corens-gap-xs">
                  <strong className="corens-card-title">Фотография</strong>
                  <span className="corens-list-description">
                    {connection.photoConsent.status === "approved"
                      ? "Оба согласились — фото доступно."
                      : connection.photoConsent.myDecision === "approved"
                        ? "Вы согласились. Ждём ответа другого человека."
                        : "Открыть фото можно отдельно — это самостоятельный шаг."}
                  </span>
                </div>
              </div>
              {statusLabel(connection.photoConsent.status) && (
                <StatusBadge tone={toneForStatus(connection.photoConsent.status)}>
                  {statusLabel(connection.photoConsent.status)}
                </StatusBadge>
              )}
            </div>
            {connection.photoConsent.myDecision === "approved" && connection.photoConsent.status !== "approved" ? (
              <StatusBadge tone="warning">Ждём ответа</StatusBadge>
            ) : (
              <ButtonLink href={`/photo-reveal?id=${id}`} variant={connection.photoConsent.status === "approved" ? "success" : "secondary"}>
                {connection.photoConsent.status === "approved" ? "Посмотреть фото" : "Показать фото"}
              </ButtonLink>
            )}
          </div>
        </Panel>
      </Section>

      <Section title="Если что-то пошло не так">
        <Panel tone="warning">
          <div className="corens-stack corens-gap-sm">
            <div className="corens-inline-head">
              <Unlink2 size={18} />
              <strong className="corens-card-title">Выйти из этой связи</strong>
            </div>
            <p className="corens-copy corens-copy-muted">
              После этого связь закроется, все открытые процессы остановятся.
            </p>
            <form action={reportConnectionAction.bind(null, id)} className="corens-stack corens-gap-sm">
              <Field
                name="note"
                label="Что случилось?"
                placeholder="Опишите кратко"
              />
              <Button type="submit" variant="secondary">Пожаловаться на этого человека</Button>
            </form>
            <form action={blockConnectionAction.bind(null, id)} className="corens-stack corens-gap-sm">
              <Field
                name="note"
                label="Почему вы хотите заблокировать?"
                placeholder="Опишите кратко"
              />
              <Button type="submit" variant="danger">Заблокировать</Button>
            </form>
          </div>
        </Panel>
      </Section>
    </AppSurface>
  );
}
