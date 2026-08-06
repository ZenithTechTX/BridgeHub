import Link from "next/link";
import { auth, signOut } from "@/auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navLinks = [
  { href: "/dashboard", label: "My Clubs" },
  { href: "/clubs", label: "Browse Clubs" },
];

export async function SiteHeader() {
  const session = await auth();
  const user = session?.user;
  const initials = (user?.name ?? user?.email ?? "?").slice(0, 2).toUpperCase();

  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center border-b bg-background px-4">
      <Link href="/" className="mr-6 text-lg font-bold tracking-tight">
        Bridge<span className="text-primary">Hub</span>
      </Link>

      {user && (
        <nav className="flex h-full items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex h-full items-center border-b-2 border-transparent px-3 text-sm font-medium text-muted-foreground hover:border-primary hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}

      <div className="ml-auto flex items-center gap-3">
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-accent">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
              <span className="hidden sm:inline">{user.name ?? user.email}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <DropdownMenuItem
                  render={
                    <button type="submit" className="w-full text-left">
                      Sign out
                    </button>
                  }
                />
              </form>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button size="sm" nativeButton={false} render={<Link href="/signin">Login / Register</Link>} />
        )}
      </div>
    </header>
  );
}
