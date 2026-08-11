import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getOrCreatePlayerForUser } from "@/db/players";
import { AccountForm } from "./account-form";

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) redirect("/signin");
  const userId = session.user.id;
  const email = session.user.email;
  const player = await getOrCreatePlayerForUser(userId, email, email.split("@")[0]);

  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-4 py-6">
      <AccountForm name={player.name} email={email} masterpoints={player.masterpoints} />
    </div>
  );
}
