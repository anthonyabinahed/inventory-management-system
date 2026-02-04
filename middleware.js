import { updateSession } from "@/libs/supabase/middleware"

export async function middleware(request) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - login, forgot-password (public auth routes - no session needed)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|login|forgot-password|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}