import { eq } from "drizzle-orm";
import Link from "next/link";
import { auth } from "@/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { db } from "@/db";
import { clubMemberships, clubs } from "@/db/schema";

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  const myClubs = await db
    .select({
      id: clubs.id,
      name: clubs.name,
      slug: clubs.slug,
      role: clubMemberships.role,
      createdAt: clubs.createdAt,
    })
    .from(clubMemberships)
    .innerJoin(clubs, eq(clubMemberships.clubId, clubs.id))
    .where(eq(clubMemberships.userId, userId));

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">My Clubs</h1>
        <Button nativeButton={false} render={<Link href="/clubs/new">New Club</Link>} />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Club</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-right">Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {myClubs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                  You haven&apos;t joined or created a club yet.
                </TableCell>
              </TableRow>
            ) : (
              myClubs.map((club) => (
                <TableRow key={club.id}>
                  <TableCell className="font-medium">
                    <Link href={`/clubs/${club.slug}`} className="hover:underline">
                      {club.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant={club.role === "ORGANIZER" ? "default" : "secondary"}>
                      {club.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {club.createdAt.toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
