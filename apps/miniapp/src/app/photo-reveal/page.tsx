import { redirect } from "next/navigation";
import { AuthBootstrapScreen } from "../../components/auth-bootstrap";
import { BackendUnavailableScreen } from "../../components/backend-unavailable";
import {
  getProfileSummary,
  MiniAppBackendUnavailableError,
  MiniAppSessionRequiredError
} from "../../lib/api";

export default async function PhotoRevealPage({
  searchParams
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id: connectionId } = await searchParams;

  if (!connectionId) {
    redirect("/connection");
  }

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

  redirect(`/connection/${connectionId}`);
}
