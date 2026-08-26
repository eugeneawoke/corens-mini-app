"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { copyConversationStarter } from "../lib/conversation-starters";

type Props = {
  text: string;
};

export function ConversationStarterCard({ text }: Props) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  async function handleCopy() {
    const copied = await copyConversationStarter(text, navigator.clipboard);
    setCopyState(copied ? "copied" : "failed");
  }

  return (
    <aside className="corens-starter-card" aria-label="Необязательная подсказка для начала разговора">
      <div className="corens-stack corens-gap-xs">
        <strong className="corens-card-title">Не знаешь, с чего начать?</strong>
        <span className="corens-copy corens-copy-muted">Можно написать так:</span>
      </div>
      <blockquote className="corens-starter-text">{text}</blockquote>
      <button
        type="button"
        className="corens-starter-copy"
        onClick={() => void handleCopy()}
      >
        {copyState === "copied" ? <Check size={16} /> : <Copy size={16} />}
        {copyState === "copied" ? "Скопировано" : "Скопировать"}
      </button>
      <p className="corens-starter-status" aria-live="polite">
        {copyState === "failed"
          ? "Не получилось скопировать — текст можно выделить вручную."
          : ""}
      </p>
    </aside>
  );
}
