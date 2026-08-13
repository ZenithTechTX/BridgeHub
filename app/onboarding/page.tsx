import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getOrCreatePlayerForUser } from "@/db/players";
import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) redirect("/signin");

  const player = await getOrCreatePlayerForUser(session.user.id, session.user.email, session.user.email.split("@")[0]);
  if (player.handle) redirect("/dashboard");

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
      <OnboardingForm defaultName={player.name} />
    </div>
  );
}
