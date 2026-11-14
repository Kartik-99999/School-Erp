import { headers } from "next/headers";
import CoreTeamForm from "./CoreTeamForm";
import SchoolForm from "./SchoolForm";
import InvalidSubdomain from "./InvalidSubdomain";
import { getTenantSubdomain } from "@/lib/config";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export default async function LoginPage() {
  const headersList = headers();
  const subdomain = getTenantSubdomain(headersList.get("host") || "");

  // Platform / Core-Team login lives on the base domain (and any non-tenant host).
  if (!subdomain) {
    return <CoreTeamForm />;
  }

  // Otherwise this is a tenant subdomain — verify the school actually exists
  // before showing its portal.
  try {
    const res = await fetch(`${API}/schools/lookup/${subdomain}`, { cache: "no-store" });

    if (res.status === 404) {
      return <InvalidSubdomain subdomain={subdomain} />;
    }

    if (res.ok) {
      const json = await res.json();
      const school = json?.data ?? json;
      return <SchoolForm school={school} />;
    }
    // Any other status (e.g. 5xx): fall through and let the form render so a
    // transient backend error doesn't hard-block a legitimate school.
  } catch {
    // Backend unreachable — fail open to the form rather than show "not found".
  }

  return <SchoolForm school={{ subdomain }} />;
}
