import { BadRequestException } from "@nestjs/common";
import type {
  AuthBootstrapRequest,
  CompleteOnboardingRequest,
  ConfirmPhotoUploadRequest,
  ConsentDecisionRequest,
  CreatePhotoUploadIntentRequest,
  DeleteAccountRequest,
  ModerationActionRequest,
  UpdateAboutRequest,
  UpdateGenderPreferenceRequest,
  UpdateStateIntentRequest,
  UpdateTrustKeysRequest,
  UpdateVisibilityRequest
} from "@corens/domain";

function ensurePlainObject(value: unknown, message = "Request body must be a JSON object"): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new BadRequestException(message);
  }

  return value as Record<string, unknown>;
}

function readString(record: Record<string, unknown>, key: string, { min = 0, max }: { min?: number; max?: number } = {}): string {
  const value = record[key];

  if (typeof value !== "string") {
    throw new BadRequestException(`${key} must be a string`);
  }

  if (value.length < min) {
    throw new BadRequestException(`${key} is too short`);
  }

  if (max !== undefined && value.length > max) {
    throw new BadRequestException(`${key} is too long`);
  }

  return value;
}

function readOptionalString(
  record: Record<string, unknown>,
  key: string,
  { max }: { max?: number } = {}
): string | undefined {
  const value = record[key];

  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new BadRequestException(`${key} must be a string`);
  }

  if (max !== undefined && value.length > max) {
    throw new BadRequestException(`${key} is too long`);
  }

  return value;
}

function readBoolean(record: Record<string, unknown>, key: string): boolean {
  const value = record[key];

  if (typeof value !== "boolean") {
    throw new BadRequestException(`${key} must be a boolean`);
  }

  return value;
}

function readOptionalNumber(record: Record<string, unknown>, key: string): number | undefined {
  const value = record[key];

  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new BadRequestException(`${key} must be a finite number`);
  }

  return value;
}

function readStringArray(record: Record<string, unknown>, key: string, { maxItems }: { maxItems?: number } = {}): string[] {
  const value = record[key];

  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    throw new BadRequestException(`${key} must be an array of strings`);
  }

  if (maxItems !== undefined && value.length > maxItems) {
    throw new BadRequestException(`${key} has too many items`);
  }

  return value;
}

export function parseAuthBootstrapRequest(input: unknown): AuthBootstrapRequest {
  const body = ensurePlainObject(input);
  return {
    initData: readString(body, "initData", { min: 1, max: 4096 })
  };
}

export function parseUpdateStateIntentRequest(input: unknown): UpdateStateIntentRequest {
  const body = ensurePlainObject(input);
  return {
    stateKey: readString(body, "stateKey", { max: 64 }),
    intentKey: readString(body, "intentKey", { max: 64 })
  };
}

export function parseUpdateTrustKeysRequest(input: unknown): UpdateTrustKeysRequest {
  const body = ensurePlainObject(input);
  return {
    trustKeys: readStringArray(body, "trustKeys", { maxItems: 16 })
  };
}

export function parseUpdateAboutRequest(input: unknown): UpdateAboutRequest {
  const body = ensurePlainObject(input);
  return {
    about: readString(body, "about", { max: 2000 })
  };
}

export function parseUpdateGenderPreferenceRequest(input: unknown): UpdateGenderPreferenceRequest {
  const body = ensurePlainObject(input);
  return {
    partnerGender: readString(body, "partnerGender", { max: 32 })
  };
}

export function parseCompleteOnboardingRequest(input: unknown): CompleteOnboardingRequest {
  const body = ensurePlainObject(input);
  return {
    displayName: readString(body, "displayName", { min: 1, max: 96 }),
    gender: readString(body, "gender", { max: 32 }),
    stateKey: readString(body, "stateKey", { max: 64 }),
    intentKey: readString(body, "intentKey", { max: 64 }),
    trustKeys: readStringArray(body, "trustKeys", { maxItems: 16 })
  };
}

export function parseUpdateVisibilityRequest(input: unknown): UpdateVisibilityRequest {
  const body = ensurePlainObject(input);
  return {
    isHidden: readBoolean(body, "isHidden")
  };
}

export function parseDeleteAccountRequest(input: unknown): DeleteAccountRequest {
  const body = ensurePlainObject(input);
  return {
    confirmation: readString(body, "confirmation", { min: 1, max: 64 })
  };
}

export function parseModerationActionRequest(input: unknown): ModerationActionRequest {
  const body = ensurePlainObject(input);
  return {
    connectionId: readString(body, "connectionId", { min: 1, max: 128 }),
    note: readOptionalString(body, "note", { max: 2000 })
  };
}

export function parseConsentDecisionRequest(input: unknown): ConsentDecisionRequest {
  const body = ensurePlainObject(input);
  return {
    decision: readString(body, "decision", { min: 1, max: 32 }) as ConsentDecisionRequest["decision"]
  };
}

export function parseCreatePhotoUploadIntentRequest(input: unknown): CreatePhotoUploadIntentRequest {
  const body = ensurePlainObject(input);
  return {
    contentType: readString(body, "contentType", { min: 1, max: 128 })
  };
}

export function parseConfirmPhotoUploadRequest(input: unknown): ConfirmPhotoUploadRequest {
  const body = ensurePlainObject(input);
  const sizeBytes = readOptionalNumber(body, "sizeBytes");

  if (sizeBytes === undefined) {
    throw new BadRequestException("sizeBytes must be provided");
  }

  return {
    intentToken: readString(body, "intentToken", { min: 1, max: 4096 }),
    fileId: readString(body, "fileId", { min: 1, max: 512 }),
    contentType: readString(body, "contentType", { min: 1, max: 128 }),
    sizeBytes
  };
}

export function parseBeaconActivateBody(input: unknown): { durationMinutes?: number } {
  if (input === undefined || input === null) {
    return {};
  }

  const body = ensurePlainObject(input);
  return {
    durationMinutes: readOptionalNumber(body, "durationMinutes")
  };
}
