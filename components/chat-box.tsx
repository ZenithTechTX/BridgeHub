export function ChatHistory({ messages }: { messages: { id: string; playerName: string; body: string }[] }) {
  return (
    <div className="flex h-64 flex-col rounded-lg border bg-sky-50 lg:h-full lg:w-72">
      <div className="border-b border-sky-200 px-3 py-2 text-base font-semibold text-muted-foreground">Chat</div>
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">No messages yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {messages.map((m) => (
              <div key={m.id} className="text-sm">
                <span className="font-semibold">{m.playerName}: </span>
                <span className="text-muted-foreground">{m.body}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
