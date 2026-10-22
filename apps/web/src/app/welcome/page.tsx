import type { Metadata } from "next";
import { MarketingHome } from "@/components/marketing/MarketingHome";

export const metadata: Metadata = {
  title: "Kryvex — Your private vault",
  description:
    "Keep credentials, secure notes and important files together in a searchable, zero-knowledge encrypted personal vault.",
};

/**
 * Public marketing home and signed-out entry point. Reached either directly
 * or through the SIGNED_OUT redirect from the authenticated vault shell.
 */
export default function WelcomePage() {
  return <MarketingHome />;
}
