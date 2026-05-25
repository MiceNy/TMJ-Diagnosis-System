"use client"
import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { UserSquare2, Lock, ShieldPlus } from "lucide-react"
import Link from "next/link";

export default function DoctorLogin() {
  const [username, setUsername] = useState("admin")
  const [password, setPassword] = useState("123456")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    // Gọi hàm signIn của NextAuth để kiểm tra Database
    const res = await signIn("credentials", {
      username,
      password,
      redirect: false, // Tắt tự động chuyển trang để tự bắt lỗi
    });

    if (res?.error) {
      setError("❌ Sai tên đăng nhập hoặc mật khẩu!");
      setIsLoading(false);
    } else {
      router.push("/doctor");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl border-none">
        <CardHeader className="bg-blue-600 rounded-t-xl text-center py-8">
          <div className="mx-auto bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mb-4">
            <ShieldPlus className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-white">Cổng Y Bác Sĩ</CardTitle>
          <p className="text-blue-100 text-sm mt-2">Hệ thống Monitor Khớp hàm</p>
        </CardHeader>
        
        <CardContent className="pt-8 px-6 pb-8">
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-2"><UserSquare2 className="h-4 w-4 text-blue-600"/> Tài khoản</label>
              <input required placeholder="Nhập username..." className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50" 
                value={username} onChange={e => setUsername(e.target.value)} />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-2"><Lock className="h-4 w-4 text-blue-600"/> Mật khẩu</label>
              <input required type="password" placeholder="••••••••" className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50"
                value={password} onChange={e => setPassword(e.target.value)} />
            </div>

            {/* Dòng báo lỗi sẽ hiện ra ở đây nếu nhập sai */}
            {error && <p className="text-red-500 text-sm font-bold bg-red-50 p-3 rounded-md border border-red-100 text-center">{error}</p>}

            <Button type="submit" disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-6 text-lg rounded-xl shadow-md mt-4">
              {isLoading ? "Đang xác thực..." : "Đăng nhập hệ thống"}
            </Button>

            {/* Nút quay lại trang chủ */}
            <div className="mt-6 text-center">
              <Link href="/" className="text-sm text-slate-500 hover:text-blue-600 transition-colors flex items-center justify-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
                Quay lại trang chủ
              </Link>
            </div>

          </form>
        </CardContent>
      </Card>
    </div>
  )
}