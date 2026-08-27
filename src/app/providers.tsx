"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { publicEnv } from "@/lib/env";

/**
 * Privy owns the session; Supabase owns the record.
 *
 * Wallets are turned OFF on both chains, deliberately and explicitly rather
 * than by relying on the default. This is US-regulated consumer credit: the
 * borrower needs a bank account for ACH, the dealer needs a lien perfected
 * with the state DMV, and the contract has to be enforceable in a county
 * court. An embedded wallet solves none of that and adds a KYC surface we
 * would then have to defend. Privy is here for email and SMS login only.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  // Without an app id the provider throws on mount, which would white-screen
  // the marketing pages for a visitor who never signs in. Render plainly.
  if (!publicEnv.privyAppId) return <>{children}</>;

  return (
    <PrivyProvider
      appId={publicEnv.privyAppId}
      config={{
        // Email, phone, and Google. All three land on the same Privy DID, so a
        // member who signs up with Google and later uses their email reaches
        // the same profile — provided Privy has linked the accounts.
        loginMethods: ["email", "sms", "google"],
        embeddedWallets: {
          ethereum: { createOnLogin: "off" },
          solana: { createOnLogin: "off" },
        },
        appearance: {
          theme: "light",
          accentColor: "#a8352a",
          // No wallet options in the login modal — there is nothing here a
          // wallet could be used for.
          walletList: [],
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
