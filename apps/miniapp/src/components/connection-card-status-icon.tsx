import { LockOpen, Reply } from "lucide-react";

import type { ConnectionCardState } from "../lib/connection-view";

export function ConnectionCardStatusIcon({
  state
}: {
  state: ConnectionCardState;
}) {
  if (state === "default") {
    return null;
  }

  const isReady = state === "ready";

  return (
    <span className="corens-connection-card-status-icon" data-state={state}>
      {isReady ? (
        <LockOpen size={15} aria-hidden="true" />
      ) : (
        <Reply size={15} aria-hidden="true" />
      )}
      <span className="corens-visually-hidden">
        {isReady
          ? "Контакт открыт — можно написать"
          : "Нужно ответить на запрос контакта"}
      </span>
    </span>
  );
}
