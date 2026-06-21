import { headers } from "next/headers";
import SchoolForm from "./login/SchoolForm";
import Landing from "@/components/landing/Landing";

export default function HomePage() {
  const host = headers().get("host") || "";
  const hostname = host.split(":")[0];
  const isBaseDomain =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    (hostname.split(".").length === 2 && !hostname.endsWith("localhost"));

  if (!isBaseDomain) {
    return <SchoolForm />;
  }
  return <Landing />;
}
