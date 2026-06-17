import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/dist/server/web/spec-extension/response";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    if (!token) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    const role = token.role as string;

    const host = req.headers.get("host") || "";
    const hostname = host.split(":")[0];
    const isBaseDomain =
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === process.env.NEXT_PUBLIC_BASE_DOMAIN ||
      hostname === "educore.com";

    if (isBaseDomain && role !== "Super Admin" && role !== "Core Team") {
      return NextResponse.redirect(new URL("/unauthorized?reason=subdomain_required", req.url));
    }

    // Route Protection Logic
    if (path.startsWith("/super-admin") && role !== "Super Admin") {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }

    if (path.startsWith("/admin") && role !== "School Admin") {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }

    if (path.startsWith("/teacher") && role !== "Teacher") {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }

    if (path.startsWith("/accountant") && role !== "Accountant") {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }

    if (path.startsWith("/parent") && role !== "Parent") {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }

    if (path.startsWith("/student") && role !== "Student") {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    "/super-admin/:path*",
    "/admin/:path*",
    "/teacher/:path*",
    "/accountant/:path*",
    "/student/:path*",
    "/parent/:path*",
    "/dashboard/:path*",
  ],
};
