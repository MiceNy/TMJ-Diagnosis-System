"use client"
import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

export default function GatewayPage() {
  const [activeTab, setActiveTab] = useState("doctor")
  const [email, setEmail] = useState("admin@benhvien.vn")
  const [password, setPassword] = useState("000000")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleHospitalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    // Gọi API NextAuth để kiểm tra tài khoản Bệnh viện thật trong Database
    const res = await signIn("credentials", {
      username: email,
      password: password,
      redirect: false,
    });

    if (res?.error) {
      setError("❌ Sai Email hoặc Mật khẩu hệ thống!");
      setIsLoading(false);
    } else {
      // Đăng nhập đúng -> Mở khóa Lớp 2 (Cổng Bác sĩ)
      router.push("/login"); 
    }
  }

  const handlePatientClick = () => {
    setActiveTab("patient");
    router.push("/patient-login");
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg border-none">
        <CardHeader className="text-center pt-8 pb-6">
          <CardTitle className="text-3xl font-bold text-[#1e3a8a]">Hệ Thống Theo Dõi Khớp</CardTitle>
          <p className="text-slate-500 text-sm mt-2">Vui lòng đăng nhập để tiếp tục</p>
        </CardHeader>
        
        <CardContent className="px-8 pb-4">
          <div className="flex bg-slate-100 p-1 rounded-lg mb-8">
            <button type="button" onClick={handlePatientClick} className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'patient' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>Bệnh Nhân</button>
            <button type="button" onClick={() => setActiveTab("doctor")} className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'doctor' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>Bác Sĩ</button>
          </div>

          <form onSubmit={handleHospitalLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-800">Email Công Việc</label>
              <input required type="email" placeholder="bacsia@benhvien.vn" className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none bg-white transition-all" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-800">Mật khẩu</label>
              <input required type="password" placeholder="••••••" className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none bg-white transition-all" value={password} onChange={e => setPassword(e.target.value)} />
            </div>

            {error && <p className="text-red-600 text-sm font-semibold text-center">{error}</p>}

            <Button type="submit" disabled={isLoading} className="w-full bg-[#1d4ed8] hover:bg-[#1e40af] text-white font-medium py-6 text-base rounded-lg shadow-sm transition-all mt-4">
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : "Đăng nhập Cổng Y Tế"}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="bg-slate-50 border-t border-slate-100 p-6 rounded-b-xl flex justify-center">
          <p className="text-sm text-slate-500">Cần hỗ trợ? Vui lòng liên hệ quản trị viên.</p>
        </CardFooter>
      </Card>
    </div>
  )
}