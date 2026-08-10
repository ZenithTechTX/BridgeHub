"use client";

import { UsersRound } from "lucide-react";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createTeamMatch } from "@/app/dashboard/matches/actions";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-md border border-black/10">
      <div className="bg-white px-4 py-2">
        <h3 className="text-sm font-bold text-red-700">{title}</h3>
      </div>
      <div className="flex flex-col gap-4 bg-[#eee6c8] px-4 py-4">{children}</div>
    </div>
  );
}

function SeatBox({ team }: { team: "team1" | "team2" }) {
  const fieldName = (seat: string) =>
    `${team}${seat[0].toUpperCase()}${seat.slice(1)}`;
  const seatInput = (seat: "north" | "east" | "south" | "west", label: string) => (
    <Input
      name={fieldName(seat)}
      placeholder={`${label} — Player name`}
      className="h-8 border-none bg-gray-300/80 text-sm placeholder:text-gray-700 focus-visible:ring-2"
    />
  );
  return (
    <div>
      <div className="mb-1 text-sm font-semibold">
        {team === "team1" ? "Team 1" : "Team 2"}
      </div>
      <div className="grid grid-cols-2 gap-1.5 rounded-md bg-green-800 p-2">
        <div className="col-span-2">{seatInput("north", "North")}</div>
        {seatInput("west", "West")}
        {seatInput("east", "East")}
        <div className="col-span-2">{seatInput("south", "South")}</div>
      </div>
    </div>
  );
}

export function CreateTeamMatchDialog() {
  const [state, formAction, pending] = useActionState(createTeamMatch, undefined);

  return (
    <Dialog>
      <DialogTrigger className="flex items-center gap-3 rounded-2xl bg-card px-5 py-4 text-left shadow-sm transition hover:shadow-md">
        <UsersRound className="size-5 shrink-0 text-indigo-700" />
        <span className="font-medium text-indigo-950">Team Matches</span>
      </DialogTrigger>

      <DialogContent
        showCloseButton={false}
        className="max-w-2xl gap-0 overflow-hidden rounded-md border-none bg-[#c9d6d6] p-0 sm:max-w-2xl"
      >
        <div className="flex items-center justify-between bg-teal-900 px-4 py-3">
          <DialogTitle className="text-lg font-bold text-white">
            Create Team Match
          </DialogTitle>
          <DialogClose className="text-xl leading-none text-white/80 hover:text-white">
            ×
          </DialogClose>
        </div>

        <form action={formAction}>
          <Tabs defaultValue="identification">
            <TabsList
              variant="line"
              className="h-auto w-full justify-start gap-4 rounded-none border-b bg-white px-4 py-2"
            >
              <TabsTrigger value="identification" className="text-sm data-active:text-indigo-700">
                Identification
              </TabsTrigger>
              <TabsTrigger value="options" className="text-sm data-active:text-indigo-700">
                Options
              </TabsTrigger>
              <TabsTrigger value="seats" className="text-sm data-active:text-indigo-700">
                Reserve seats
              </TabsTrigger>
            </TabsList>

            <div className="max-h-[65vh] overflow-y-auto bg-[#c9d6d6] p-4">
              <TabsContent value="identification" keepMounted>
                <Section title="Identification">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="title" className="text-xs text-muted-foreground">
                      Title
                    </Label>
                    <Input id="title" name="title" required className="bg-white" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="description" className="text-xs text-muted-foreground">
                      Description
                    </Label>
                    <Input id="description" name="description" className="bg-white" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="team1Name" className="text-xs text-muted-foreground">
                        Team 1
                      </Label>
                      <Input
                        id="team1Name"
                        name="team1Name"
                        placeholder="Team 1"
                        className="bg-white"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="team2Name" className="text-xs text-muted-foreground">
                        Team 2
                      </Label>
                      <Input
                        id="team2Name"
                        name="team2Name"
                        placeholder="Team 2"
                        className="bg-white"
                      />
                    </div>
                  </div>
                </Section>
              </TabsContent>

              <TabsContent value="options" keepMounted>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Section title="Boards">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="boardsCount" className="text-xs text-muted-foreground">
                        Number of Boards
                      </Label>
                      <Input
                        id="boardsCount"
                        name="boardsCount"
                        type="number"
                        min={1}
                        max={40}
                        defaultValue={8}
                        required
                        className="bg-white"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Scored by IMPs.</p>
                  </Section>

                  <Section title="Deal source">
                    <div className="flex flex-col gap-2 text-sm">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="dealSourceDisplay"
                          defaultChecked
                          className="accent-indigo-700"
                        />
                        Use random deals
                      </label>
                      <label className="flex items-center gap-2 text-muted-foreground">
                        <input type="radio" name="dealSourceDisplay" disabled />
                        Use saved deals
                      </label>
                      <Button type="button" variant="outline" size="sm" disabled className="w-fit">
                        Select folder
                      </Button>
                    </div>
                  </Section>
                </div>

                <div className="mt-4">
                  <Section title="Options">
                    <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                      <label className="flex items-center gap-2">
                        <input type="checkbox" disabled defaultChecked className="accent-amber-600" />
                        Allow kibitzers
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" disabled defaultChecked className="accent-amber-600" />
                        Allow kibitzers to chat with players
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" disabled defaultChecked className="accent-amber-600" />
                        Allow Undos
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" disabled className="accent-amber-600" />
                        Allow Voice
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" disabled defaultChecked className="accent-amber-600" />
                        Barometer scoring
                      </label>
                    </div>
                  </Section>
                </div>
              </TabsContent>

              <TabsContent value="seats" keepMounted>
                <Section title="Reserve seats (optional)">
                  <SeatBox team="team1" />
                  <SeatBox team="team2" />
                </Section>
              </TabsContent>
            </div>
          </Tabs>

          <div className="flex justify-center gap-3 bg-[#b9c8c8] px-4 py-4">
            {state?.error && (
              <p className="mr-auto self-center text-sm text-destructive">{state.error}</p>
            )}
            <Button type="submit" disabled={pending} className="bg-indigo-700 hover:bg-indigo-800">
              {pending ? "Creating…" : "Create Team Match"}
            </Button>
            <DialogClose
              render={
                <Button type="button" className="bg-indigo-700 hover:bg-indigo-800">
                  Close
                </Button>
              }
            />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
