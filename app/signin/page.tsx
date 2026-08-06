import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn } from "@/auth";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; sent?: string }>;
}) {
  const { callbackUrl, sent } = await searchParams;

  async function sendMagicLink(formData: FormData) {
    "use server";
    const email = formData.get("email") as string;
    await signIn("email", {
      email,
      redirect: false,
    });
    const { redirect } = await import("next/navigation");
    redirect(`/signin?sent=1${callbackUrl ? `&callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`);
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign in to BridgeHub</CardTitle>
          <CardDescription>
            We&apos;ll email you a link to sign in — no password needed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <p className="text-sm text-muted-foreground">
              Check your email for a sign-in link. (In local dev with no SMTP
              configured, the link is printed to the server console instead.)
            </p>
          ) : (
            <form action={sendMagicLink} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                Send sign-in link
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
