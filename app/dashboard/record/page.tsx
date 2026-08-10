import { desc, eq, inArray } from "drizzle-orm";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { db } from "@/db";
import { getOrCreatePlayerForUser } from "@/db/players";
import { matches, pairMembers, pairs, pairStandings, sessions, teamMembers } from "@/db/schema";
import { auth } from "@/auth";

export default async function MyRecordPage() {
  const session = await auth();
  const userId = session!.user!.id!;
  const email = session!.user!.email!;
  const player = await getOrCreatePlayerForUser(userId, email, email.split("@")[0]);

  const myPairRows = await db
    .select({ pairId: pairMembers.pairId })
    .from(pairMembers)
    .where(eq(pairMembers.playerId, player.playerId));
  const myPairIds = myPairRows.map((r) => r.pairId);

  const myPairs = myPairIds.length
    ? await db.select().from(pairs).where(inArray(pairs.pairId, myPairIds))
    : [];
  const sessionIds = [...new Set(myPairs.map((p) => p.sessionId))];

  const mySessions = sessionIds.length
    ? await db.select().from(sessions).where(inArray(sessions.sessionId, sessionIds)).orderBy(desc(sessions.date))
    : [];

  const [myTeamMembers, myPairStandings] = await Promise.all([
    myPairIds.length
      ? db.select().from(teamMembers).where(inArray(teamMembers.pairId, myPairIds))
      : Promise.resolve([]),
    myPairIds.length
      ? db.select().from(pairStandings).where(inArray(pairStandings.pairId, myPairIds))
      : Promise.resolve([]),
  ]);
  const myTeamIds = myTeamMembers.map((t) => t.teamId);
  const teamMatches = myTeamIds.length ? await db.select().from(matches).where(inArray(matches.team1Id, myTeamIds)) : [];
  const teamMatches2 = myTeamIds.length ? await db.select().from(matches).where(inArray(matches.team2Id, myTeamIds)) : [];
  const allMyMatches = [...teamMatches, ...teamMatches2];

  const resultFor = (s: (typeof mySessions)[number]) => {
    if (s.sessionType === "swiss") {
      const match = allMyMatches.find((m) => m.sessionId === s.sessionId);
      if (!match) return "—";
      const myTeamIsTeam1 = myTeamIds.includes(match.team1Id);
      const vp = myTeamIsTeam1 ? match.team1Vp : match.team2Vp;
      return vp != null ? `${vp} VP` : "In progress";
    }
    const pairIdsInSession = myPairs.filter((p) => p.sessionId === s.sessionId).map((p) => p.pairId);
    const standing = myPairStandings.find((st) => pairIdsInSession.includes(st.pairId));
    if (!standing) return "—";
    return standing.percentage != null ? `${standing.percentage}%${standing.rank ? ` (#${standing.rank})` : ""}` : "In progress";
  };

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
      <h1 className="mb-4 text-xl font-semibold">My Record</h1>

      {mySessions.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          You haven&apos;t played in any sessions yet — once you join a game, your results will show up here.
        </p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Session</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Result</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mySessions.map((s) => (
                <TableRow key={s.sessionId}>
                  <TableCell className="text-muted-foreground">{s.date.toLocaleDateString()}</TableCell>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="text-muted-foreground">{s.sessionType}</TableCell>
                  <TableCell className="text-right">{resultFor(s)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
