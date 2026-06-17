import { headers } from "next/headers";
import CoreTeamForm from "./CoreTeamForm";
import SchoolForm from "./SchoolForm";
import InvalidSubdomain from "./InvalidSubdomain";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export default async function LoginPage() {
  const headersList = headers();
  const host = headersList.get("host") || "";
  const hostname = host.split(":")[0];
  const isBaseDomain =
    hostname === "localhost" ||
    hostname.startsWith("www.") ||
    (hostname.split(".").length === 2 && !hostname.endsWith("localhost"));

  // Platform / Core-Team login lives on the base domain.
  if (isBaseDomain) {
    return <CoreTeamForm />;
  }

  // Otherwise this is a tenant subdomain — verify the school actually exists
  // before showing its portal.
  const subdomain = hostname.split(".")[0];
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
