import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") || "";
  
  // If visited via the default Vercel domain alias, redirect to the official custom domain
  if (host.includes("gait-physio-clinic-v1.vercel.app")) {
    const url = request.nextUrl.clone();
    url.host = "gaitphysioclinic.com";
    url.protocol = "https";
    url.port = "";
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
