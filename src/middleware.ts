import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "bookleaf_session";

async function getPayload(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || "bookleaf-dev-secret-change-in-production"
    );
    const { payload } = await jwtVerify(token, secret);
    return payload as { role?: string };
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const payload = await getPayload(req);

  if (pathname.startsWith("/login")) {
    if (payload?.role === "ADMIN") {
      return NextResponse.redirect(new URL("/admin/tickets", req.url));
    }
    if (payload?.role === "AUTHOR") {
      return NextResponse.redirect(new URL("/author/books", req.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/author")) {
    if (!payload) return NextResponse.redirect(new URL("/login", req.url));
    if (payload.role !== "AUTHOR") {
      return NextResponse.redirect(new URL("/admin/tickets", req.url));
    }
  }

  if (pathname.startsWith("/admin")) {
    if (!payload) return NextResponse.redirect(new URL("/login", req.url));
    if (payload.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/author/books", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/author/:path*", "/admin/:path*"],
};
