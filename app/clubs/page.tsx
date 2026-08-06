import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { db } from "@/db";
import { clubs } from "@/db/schema";

export default async function BrowseClubsPage() {
  const allClubs = await db.select().from(clubs).orderBy(clubs.createdAt);

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
      <h1 className="mb-4 text-xl font-semibold">Browse Clubs</h1>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Club</TableHead>
              <TableHead>Description</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allClubs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} className="h-24 text-center text-muted-foreground">
                  No clubs yet.
                </TableCell>
              </TableRow>
            ) : (
              allClubs.map((club) => (
                <TableRow key={club.id}>
                  <TableCell className="font-medium">
                    <Link href={`/clubs/${club.slug}`} className="hover:underline">
                      {club.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {club.description ?? "—"}
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
