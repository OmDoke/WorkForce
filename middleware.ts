import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

export async function middleware(request: NextRequest) {
  // Update session
  const { supabaseResponse, user, supabase } = await updateSession(request)

  const url = request.nextUrl.clone()
  const path = url.pathname

  // Public paths that do not require authentication
  if (path === '/' || path.startsWith('/login') || path.startsWith('/verify-otp')) {
    // If logged in, redirect to dashboard
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (profile) {
        if (profile.role === 'customer') {
          url.pathname = '/dashboard'
          return NextResponse.redirect(url)
        } else if (profile.role === 'worker' || profile.role === 'new_worker') {
          url.pathname = '/worker/dashboard' // Placeholders
          return NextResponse.redirect(url)
        } else if (profile.role === 'admin') {
          url.pathname = '/admin/dashboard'
          return NextResponse.redirect(url)
        }
      }
    }
    return supabaseResponse
  }

  // Authentication required beyond this point
  if (!user) {
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Role-based route guards
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  
  if (!profile) {
    // If no profile, allow registration paths
    const allowedNoProfilePaths = ['/register', '/worker/register', '/worker/complete-profile'];
    if (!allowedNoProfilePaths.includes(path)) {
      url.pathname = '/register'
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  const role = profile.role

  // Customer routes (Customer can't access worker or admin)
  if (path.startsWith('/worker') && role !== 'worker' && role !== 'new_worker' && role !== 'admin') {
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // Admin routes
  if (path.startsWith('/admin') && role !== 'admin') {
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
