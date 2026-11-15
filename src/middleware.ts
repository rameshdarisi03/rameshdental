import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") || "";
  
  // If visited via an old domain alias, redirect or pass through cleanly
  const pathname = request.nextUrl.pathname;
  if (/[)\]>.,;]$/.test(pathname)) {
    const cleanedPath = pathname.replace(/[)\]>.,;]+$/, "");
    const url = request.nextUrl.clone();
    url.pathname = cleanedPath;
    return NextResponse.redirect(url, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes
     * - _next/static, _next/image
     * - static files (manifest.json, sw.js, favicon.ico, images, etc.)
     */
    "/((?!api|_next/static|_next/image|manifest.*\\.json|sw.js|favicon.ico|icon.png|apple-icon.png|images|robots.txt|sitemap.xml).*)",
  ],
};
