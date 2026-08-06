import { DrizzleAdapter } from "@auth/drizzle-adapter";
import NextAuth from "next-auth";
import Email from "next-auth/providers/email";
import { createTransport } from "nodemailer";
import { db } from "@/db";
import { accounts, sessions, users, verificationTokens } from "@/db/schema";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: { strategy: "database" },
  providers: [
    Email({
      // Required by the provider's config validation even though our custom
      // sendVerificationRequest below bypasses it when EMAIL_SERVER is unset.
      server: process.env.EMAIL_SERVER ?? "smtp://localhost:1025",
      from: process.env.EMAIL_FROM ?? "BridgeHub <onboarding@bridgehub.dev>",
      sendVerificationRequest: async ({ identifier, url, provider }) => {
        if (!process.env.EMAIL_SERVER) {
          console.log(`\n[dev] Magic sign-in link for ${identifier}:\n${url}\n`);
          return;
        }
        const transport = createTransport(process.env.EMAIL_SERVER);
        await transport.sendMail({
          to: identifier,
          from: provider.from,
          subject: "Sign in to BridgeHub",
          text: `Sign in to BridgeHub: ${url}`,
          html: `<p><a href="${url}">Sign in to BridgeHub</a></p>`,
        });
      },
    }),
  ],
  pages: {
    signIn: "/signin",
  },
});
