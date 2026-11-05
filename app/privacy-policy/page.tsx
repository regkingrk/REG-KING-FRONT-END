import type { Metadata } from "next";
import { PolicyPage } from "@/components/PolicyPage";

export const metadata: Metadata = { title: "Privacy Policy | REG KING", alternates: { canonical: "/privacy-policy" } };
export const revalidate = 3600;

export default function Page() {
  return <PolicyPage policy="privacyPolicy" title="Privacy Policy" />;
}
