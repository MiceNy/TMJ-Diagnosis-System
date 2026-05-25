import { withAuth } from "next-auth/middleware"

export default withAuth(
  function middleware(req) {
    // Để trống để NextAuth tự xử lý
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

export const config = { 
  matcher: ["/doctor/:path*"] 
}