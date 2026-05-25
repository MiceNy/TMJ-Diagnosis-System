import NextAuth from "next-auth";
import { authOptions } from "./auth-options"; // Import từ file vừa tạo ngay cùng thư mục

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };