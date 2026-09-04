"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { updateAboutAction } from "../app/actions";
import {
  createBioSaveRequest,
  createBioSaveState,
  reconcileBioSaveStateWithServer,
  resolveBioSaveRequest,
  setBioSaveValue,
  settleBioSaveAction
} from "../lib/bio-save-state";
import { ProfileContentError } from "./profile-content-error";

interface BioFieldProps {
  initialValue: string | null;
}

export function BioField({ initialValue }: BioFieldProps) {
  const [saveState, setSaveState] = useState(() => createBioSaveState(initialValue ?? ""));
  const [, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setSaveState((current) => reconcileBioSaveStateWithServer(current, initialValue ?? ""));
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
  }, [saveState.value]);

  const handleBlur = () => {
    const request = createBioSaveRequest(saveState);
    if (request.value !== saveState.savedValue) {
      startTransition(() => {
        void settleBioSaveAction(() => updateAboutAction(request.value)).then((result) => {
          setSaveState((current) => resolveBioSaveRequest(current, request, result));
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
          value={saveState.value}
          onChange={(event) => setSaveState((current) => setBioSaveValue(current, event.target.value))}
          onBlur={handleBlur}
          aria-describedby={saveState.error ? "bio-content-error" : undefined}
          aria-invalid={Boolean(saveState.error)}
          maxLength={200}
          placeholder="Расскажите немного о себе"
          rows={3}
        />
      </div>
      <ProfileContentError
        state={saveState.error ? { error: saveState.error } : null}
        field="about"
        id="bio-content-error"
      />
      <p className="corens-copy corens-copy-muted corens-bio-counter">
        {saveState.value.length}/200
      </p>
    </div>
  );
}
