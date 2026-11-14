import { headers } from "next/headers";
import SchoolForm from "./login/SchoolForm";
import Landing from "@/components/landing/Landing";
import { getTenantSubdomain } from "@/lib/config";

export default function HomePage() {
  if (getTenantSubdomain(headers().get("host") || "")) {
    return <SchoolForm />;
  }
  return <Landing />;
}
