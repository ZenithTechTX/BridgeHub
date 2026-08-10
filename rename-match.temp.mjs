import postgres from "postgres";
import { config } from "dotenv";
config({ path: ".env.local" });

const sql = postgres(process.env.DIRECT_URL, { prepare: false });

const sessionId = process.argv[2];
if (!sessionId) throw new Error("Usage: node rename-match.temp.mjs <sessionId>");

const [match] = await sql`select team1_id, team2_id from matches where session_id = ${sessionId}`;
if (!match) throw new Error("No match found for session " + sessionId);

const [team1] = await sql`select team_name from teams where team_id = ${match.team1_id}`;
const [team2] = await sql`select team_name from teams where team_id = ${match.team2_id}`;

const newName = `${team1.team_name} vs ${team2.team_name} Match Result`;
await sql`update sessions set name = ${newName} where session_id = ${sessionId}`;
console.log("Renamed session", sessionId, "to:", newName);

await sql.end();
