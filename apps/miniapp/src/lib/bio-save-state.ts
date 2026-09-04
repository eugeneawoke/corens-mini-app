import {
  getProfileContentActionError,
  type ProfileContentActionState
} from "./profile-content-errors";

type BioSaveError = NonNullable<ProfileContentActionState>["error"];

export type BioSaveState = {
  value: string;
  savedValue: string;
  revision: number;
  error?: BioSaveError;
};

export type BioSaveRequest = {
  value: string;
  revision: number;
};

export function createBioSaveState(value: string): BioSaveState {
  return { value, savedValue: value, revision: 0 };
}

export function reconcileBioSaveStateWithServer(
  state: BioSaveState,
  serverValue: string
): BioSaveState {
  if (state.value !== state.savedValue) {
    return { ...state, savedValue: serverValue };
  }

  if (state.value === serverValue && !state.error) {
    return state;
  }

  return { ...state, value: serverValue, savedValue: serverValue, error: undefined };
}

export function setBioSaveValue(state: BioSaveState, value: string): BioSaveState {
  return {
    ...state,
    value,
    revision: state.revision + 1,
    error: undefined
  };
}

export function createBioSaveRequest(state: BioSaveState): BioSaveRequest {
  return { value: state.value.trim(), revision: state.revision };
}

export function resolveBioSaveRequest(
  state: BioSaveState,
  request: BioSaveRequest,
  result: ProfileContentActionState
): BioSaveState {
  if (request.revision !== state.revision || request.value !== state.value.trim()) {
    return state;
  }

  if (result?.error) {
    return { ...state, error: result.error };
  }

  return { ...state, savedValue: request.value, error: undefined };
}

export async function settleBioSaveAction(
  action: () => Promise<ProfileContentActionState>
): Promise<ProfileContentActionState> {
  try {
    return await action();
  } catch {
    return getProfileContentActionError("about", null);
  }
}
