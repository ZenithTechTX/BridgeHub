"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SKILL_LEVELS } from "@/lib/skill-levels";
import { completeOnboardingAction } from "./actions";

export function OnboardingForm({ defaultName }: { defaultName: string }) {
  const [state, formAction, pending] = useActionState(completeOnboardingAction, undefined);

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Welcome to BridgeHub</CardTitle>
        <CardDescription>A few details before you get started.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" defaultValue={defaultName} placeholder="Jane Smith" required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="handle">Player ID</Label>
            <Input id="handle" name="handle" placeholder="janesmith" required minLength={3} maxLength={20} />
            <p className="text-xs text-muted-foreground">
              Letters, numbers, and underscores only. This is how others will find you.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="skillLevel">Skill level</Label>
            <select
              id="skillLevel"
              name="skillLevel"
              required
              defaultValue=""
              className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
            >
              <option value="" disabled>
                Select a skill level
              </option>
              {SKILL_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </div>
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Get started"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
