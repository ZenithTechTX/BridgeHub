"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClub } from "./actions";

export default function NewClubPage() {
  const [state, formAction, pending] = useActionState(createClub, undefined);

  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-4 py-6">
      <Card>
        <CardHeader>
          <CardTitle>Create a club</CardTitle>
          <CardDescription>
            A club is the organizer account you&apos;ll run tournaments under.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Club name</Label>
              <Input id="name" name="name" placeholder="Riverside Bridge Club" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="slug">Club URL</Label>
              <div className="flex items-center text-sm text-muted-foreground">
                <span className="mr-1">bridgehub.app/clubs/</span>
                <Input id="slug" name="slug" placeholder="riverside-bridge-club" required />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Input id="description" name="description" placeholder="Weekly duplicate games" />
            </div>
            {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
            <Button type="submit" disabled={pending}>
              {pending ? "Creating…" : "Create club"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
