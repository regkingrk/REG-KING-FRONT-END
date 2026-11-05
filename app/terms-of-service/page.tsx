import type { Metadata } from "next";
import { PolicyPage } from "@/components/PolicyPage";

export const metadata: Metadata = { title: "Terms of Service | REG KING", alternates: { canonical: "/terms-of-service" } };
export const revalidate = 3600;

export default function Page() {
  return <PolicyPage policy="termsOfService" title="Terms of Service" />;
}
