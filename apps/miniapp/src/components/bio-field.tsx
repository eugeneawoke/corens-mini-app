"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { updateAboutAction } from "../app/actions";
import { getProfileContentSupportHref } from "../lib/profile-content-errors";

interface BioFieldProps {
  initialValue: string | null;
}

export function BioField({ initialValue }: BioFieldProps) {
  const [value, setValue] = useState(initialValue ?? "");
  const [, startTransition] = useTransition();
  const [error, setError] = useState<{
    category: "abusive" | "contact" | "advertising" | null;
    message: string;
  } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const initialValueRef = useRef(initialValue ?? "");

  useEffect(() => {
    const nextValue = initialValue ?? "";
    setValue(nextValue);
    initialValueRef.current = nextValue;
    setError(null);
  }, [initialValue]);

  const resizeTextarea = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "0px";
    const maxHeight = 160;
    const nextHeight = Math.min(textarea.scrollHeight, maxHeight);
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? "auto" : "hidden";
  };

  useEffect(() => {
    resizeTextarea();
  }, [value]);

  const handleBlur = () => {
    const trimmed = value.trim();
    if (trimmed !== initialValueRef.current) {
      startTransition(() => {
        void updateAboutAction(trimmed).then((result) => {
          if (result?.error) {
            setError(result.error);
            return;
          }

          initialValueRef.current = trimmed;
          setError(null);
        });
      });
    }
  };

  return (
    <div className="corens-bio-field">
      <span className="corens-eyebrow">О себе</span>
      <div className="corens-bio-editor">
        <textarea
          ref={textareaRef}
          className="corens-bio-textarea"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={handleBlur}
          aria-describedby={error ? "bio-content-error" : undefined}
          aria-invalid={Boolean(error)}
          maxLength={200}
          placeholder="Расскажите немного о себе"
          rows={3}
        />
      </div>
      {error ? (
        <div id="bio-content-error" className="corens-profile-content-error" role="alert" aria-live="assertive">
          <span>{error.message}</span>
          {error.category ? (
            <a
              className="corens-profile-content-support-link"
              href={getProfileContentSupportHref()}
              aria-describedby="bio-content-error"
            >
              Задать вопрос поддержке
            </a>
          ) : null}
        </div>
      ) : null}
      <p className="corens-copy corens-copy-muted corens-bio-counter">
        {value.length}/200
      </p>
    </div>
  );
}
