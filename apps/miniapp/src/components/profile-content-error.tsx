import {
  getProfileContentSupportHref,
  type ProfileContentActionState,
  type ProfileContentField
} from "../lib/profile-content-errors";

type Props = {
  state: ProfileContentActionState;
  dismissedState?: ProfileContentActionState;
  field: ProfileContentField;
  id: string;
};

export function ProfileContentError({ state, dismissedState, field, id }: Props) {
  const error = state?.error;

  if (!error || error.field !== field || state === dismissedState) {
    return null;
  }

  return (
    <div id={id} className="corens-profile-content-error" role="alert" aria-live="assertive">
      <span>{error.message}</span>
      {error.category ? (
        <a
          className="corens-profile-content-support-link"
          href={getProfileContentSupportHref()}
          aria-describedby={id}
        >
          Задать вопрос поддержке
        </a>
      ) : null}
    </div>
  );
}
