import { redirect } from "next/navigation";

import { AuthBootstrapScreen } from "../../../components/auth-bootstrap";
import { BackendUnavailableScreen } from "../../../components/backend-unavailable";
import {
  getProfileSummary,
  MiniAppBackendUnavailableError,
  MiniAppSessionRequiredError
} from "../../../lib/api";
import { IntroSlides } from "./intro-slides";

export default async function OnboardingIntroPage() {
  let snapshot;

  try {
    snapshot = await getProfileSummary();
  } catch (error) {
    if (error instanceof MiniAppSessionRequiredError) {
      return <AuthBootstrapScreen />;
    }

    if (error instanceof MiniAppBackendUnavailableError) {
      return <BackendUnavailableScreen />;
    }

    throw error;
  }

  if (snapshot.onboardingCompleted) {
    redirect("/connection");
  }

  if (snapshot.onboardingStartedAt) {
    redirect("/onboarding");
  }

  return <IntroSlides />;
}
