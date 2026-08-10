export function ChatInputBar({ action }: { action: (formData: FormData) => Promise<void> }) {
  return (
    <form action={action} className="flex gap-2">
      <input
        name="body"
        placeholder="Message"
        maxLength={500}
        autoComplete="off"
        className="h-11 flex-1 rounded-md border bg-white px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      />
      <button type="submit" className="rounded-md bg-indigo-700 px-5 text-base font-medium text-white hover:bg-indigo-800">
        Send
      </button>
    </form>
  );
}
