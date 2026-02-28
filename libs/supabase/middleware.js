import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import config from '@/config'

export async function updateSession(request) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // With Fluid compute, don't put this client in a global environment
  // variable. Always create a new one on each request.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        },
      },
    }
  )

  // Do not run code between createServerClient and
  // supabase.auth.getClaims(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: If you remove getClaims() and you use server-side rendering
  // with the Supabase client, your users may be randomly logged out.
  const { data } = await supabase.auth.getClaims()

  const user = data?.claims

  const path = new URL(request.url).pathname

  // Public API routes that handle their own auth (e.g., Vercel Cron with CRON_SECRET)
  const publicApiRoutes = [config.routes.api.alerts.sendDigest]

  // Protected route prefixes (use startsWith for nested routes)
  const protectedPrefixes = [config.routes.adminPrefix, config.routes.apiPrefix]
  // Protected exact routes
  const protectedExact = [config.routes.home]
  // Auth routes (redirect away if already authenticated)
  // Note: acceptInvite and resetPassword are NOT included here because
  // users need to access them while authenticated to set their password
  const authRoutes = [config.routes.login, config.routes.forgotPassword]

  const isPublicApi = publicApiRoutes.includes(path)
  const isProtected = !isPublicApi &&
                      (protectedPrefixes.some(prefix => path.startsWith(prefix)) ||
                      protectedExact.includes(path))
  const isAuthRoute = authRoutes.includes(path)

  // Helper: create redirect response with cookies copied from supabaseResponse
  // Per Supabase docs, we must copy cookies to avoid session sync issues
  const createRedirect = (url) => {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = url
    const response = NextResponse.redirect(redirectUrl)
    supabaseResponse.cookies.getAll().forEach(({ name, value, ...options }) => {
      response.cookies.set(name, value, options)
    })
    return response
  }

  // Unauthenticated user trying to access protected route → redirect to login
  if (isProtected && !user) {
    return createRedirect(config.routes.login)
  }

  // Deactivated user on protected route → sign out and redirect to login
  if (isProtected && user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_active')
      .eq('id', user.sub)
      .single()

    if (profile && !profile.is_active) {
      await supabase.auth.signOut()
      return createRedirect(config.routes.login)
    }
  }

  // Authenticated user trying to access auth route → redirect to home
  if (isAuthRoute && user) {
    return createRedirect(config.routes.home)
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    supabaseResponse.cookies.getAll().forEach(({ name, value, ...options }) => {
  //      myNewResponse.cookies.set(name, value, options)
  //    })
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse
}