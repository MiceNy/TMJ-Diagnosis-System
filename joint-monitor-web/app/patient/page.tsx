"use client"
import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { User, KeyRound, Activity } from "lucide-react"
import Link from "next/link";

export default function PatientLogin() {
  const [patientId, setPatientId] = useState("")
  const [accessCode, setAccessCode] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    // Gọi hàm signIn của NextAuth (nhớ điều chỉnh nếu logic backend của bạn khác)
    const res = await signIn("credentials", {
      username: patientId, // Hoặc trường ID tương ứng trong backend của bạn
      password: accessCode,
      isPatient: true,
      redirect: false, 
    });

    if (res?.error) {
      setError("❌ Sai mã bệnh nhân hoặc Access Code!");
      setIsLoading(false);
    } else {
      router.push(`/patient/${patientId}`);
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl border-none">
        <CardHeader className="bg-[#059669] rounded-t-xl text-center py-8">
          <div className="mx-auto bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mb-4">
            <Activity className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-white">Tra cứu Hồ sơ Y tế</CardTitle>
          <p className="text-emerald-100 text-sm mt-2">Dành riêng cho Bệnh nhân</p>
        </CardHeader>
        
        <CardContent className="pt-8 px-6 pb-8">
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <User className="h-4 w-4 text-[#059669]"/> Mã bệnh nhân (ID)
              </label>
              <input required placeholder="VD: BN-001" className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#059669] outline-none bg-slate-50" 
                value={patientId} onChange={e => setPatientId(e.target.value)} />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-[#059669]"/> Mã truy cập (Access Code)
              </label>
              <input required type="password" placeholder="Nhập mã 6 số do bác sĩ cấp" className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#059669] outline-none bg-slate-50"
                value={accessCode} onChange={e => setAccessCode(e.target.value)} />
            </div>

            {error && <p className="text-red-500 text-sm font-bold bg-red-50 p-3 rounded-md border border-red-100 text-center">{error}</p>}

            <Button type="submit" disabled={isLoading} className="w-full bg-[#059669] hover:bg-emerald-700 text-white font-bold py-6 text-lg rounded-xl shadow-md mt-4">
              {isLoading ? "Đang xác thực..." : "Truy cập hồ sơ"}
            </Button>

            {/* Nút quay lại trang chủ tone xanh lá */}
            <div className="mt-6 text-center">
              <Link href="/" className="text-sm text-slate-500 hover:text-[#059669] transition-colors flex items-center justify-center gap-2">
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