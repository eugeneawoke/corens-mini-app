import {
  getProfileContentSupportHref,
  type ProfileContentActionState,
  type ProfileContentField
} from "../lib/profile-content-errors";

type Props = {
  state: ProfileContentActionState;
  field: ProfileContentField;
  id: string;
};

export function ProfileContentError({ state, field, id }: Props) {
  const error = state?.error;

  if (!error || error.field !== field) {
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
