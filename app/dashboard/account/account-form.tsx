"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updatePlayerProfile } from "./actions";

export function AccountForm({
  name,
  email,
  masterpoints,
}: {
  name: string;
  email: string;
  masterpoints: number | null;
}) {
  const [state, formAction, pending] = useActionState(updatePlayerProfile, undefined);

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Account</CardTitle>
        <CardDescription>Your player profile, shown on match rosters and results.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Display name</Label>
            <Input id="name" name="name" defaultValue={name} placeholder="Jane Smith" required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" defaultValue={email} disabled />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="masterpoints">Masterpoints</Label>
            <Input id="masterpoints" defaultValue={masterpoints ?? "0"} disabled />
          </div>
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          {state?.success && <p className="text-sm text-muted-foreground">Saved.</p>}
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save changes"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
