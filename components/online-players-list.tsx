export function OnlinePlayersList({ players }: { players: { playerId: string; name: string }[] }) {
  return (
    <div className="w-full shrink-0 rounded-2xl border bg-card p-3 lg:w-56">
      <div className="mb-2 text-sm font-semibold text-muted-foreground">
        Online ({players.length})
      </div>
      {players.length === 0 ? (
        <p className="text-sm text-muted-foreground">No one else is online right now.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {players.map((p) => (
            <li key={p.playerId} className="flex items-center gap-2 text-sm">
              <span className="size-2 shrink-0 rounded-full bg-emerald-500" />
              <span className="truncate">{p.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
