import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "@/lib/prisma"; // Dùng prisma đã cấu hình Singleton cho bản 7



export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
        isPatient: { label: "Is Patient", type: "text" } 
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        // 1. Phân luồng Bệnh nhân
        if (credentials.isPatient === "true") {
          const patient = await prisma.patient.findUnique({ where: { id: credentials.username } });
          if (patient && patient.accessCode === credentials.password) {
            return { id: patient.id, name: patient.name, role: "patient" };
          }
          return null;
        }

        // 2. Phân luồng Bệnh viện (Kiểm tra dấu @)
        if (credentials.username.includes("@")) {
          const hospital = await prisma.hospitalAccount.findUnique({ where: { email: credentials.username } });
          if (hospital && hospital.password === credentials.password) {
            return { id: hospital.id, name: hospital.name, role: "hospital" };
          }
          return null;
        }

        // 3. Phân luồng Bác sĩ (Tài khoản thường như admin, admin2...)
        const doctor = await prisma.doctor.findUnique({ where: { username: credentials.username } });
        if (doctor && doctor.password === credentials.password) {
          return { id: doctor.id, name: doctor.name, role: "doctor" };
        }

        return null;
      }
    })
  ],
  // QUAN TRỌNG: Thêm callbacks để lưu Role vào Session, giúp bạn phân quyền ở giao diện
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).id = token.id;
      }
      return session;
    }
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: '/', 
  }
};