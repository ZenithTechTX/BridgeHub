import { notFound } from "next/navigation";
import { db } from "@/db";

export default async function ClubPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const club = await db.query.clubs.findFirst({
    where: (club, { eq }) => eq(club.slug, slug),
  });

  if (!club) notFound();

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
      <h1 className="text-xl font-semibold">{club.name}</h1>
      {club.description && (
        <p className="mt-1 text-muted-foreground">{club.description}</p>
      )}
      <p className="mt-6 text-sm text-muted-foreground">
        No events yet — event creation is coming in the next milestone.
      </p>
    </div>
  );
}
