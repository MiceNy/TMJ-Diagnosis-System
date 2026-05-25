"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { UserPlus, Activity, History, X, Trash2, LogOut } from "lucide-react" 
import { signOut } from "next-auth/react"

export default function DoctorDashboard() {
  const [patients, setPatients] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newPatient, setNewPatient] = useState({ id: '', name: '', age: '', gender: 'Nam' })
  const router = useRouter()

  const fetchPatients = async () => {
    try {
      const res = await fetch("/api/patients");
      if (!res.ok) {
        console.error("Lỗi kết nối đến API");
        return; 
      }
      const data = await res.json();
      setPatients(data);
    } catch (error) {
      console.error("Lỗi khi tải danh sách:", error);
    }
  }

  useEffect(() => { fetchPatients() }, [])

  const handleAddPatient = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await fetch("/api/patients", {
      method: "POST",
      body: JSON.stringify(newPatient)
    })
    if (res.ok) {
      setIsModalOpen(false)
      setNewPatient({ id: '', name: '', age: '', gender: 'Nam' })
      fetchPatients()
    } else {
      alert("Lỗi: Có thể mã BN này đã tồn tại!")
    }
  }

  const handleDeletePatient = async (id: string, name: string) => {
    const confirmDelete = window.confirm(`⚠️ CẢNH BÁO:\nBạn có chắc chắn muốn xóa hồ sơ của bệnh nhân ${name} (${id})?\nToàn bộ lịch sử khám của người này sẽ bị xóa vĩnh viễn và không thể khôi phục!`);
    
    if (confirmDelete) {
      const res = await fetch(`/api/patients/${id}`, { method: 'DELETE' });
      if (res.ok) {
        alert("✅ Đã xóa hồ sơ bệnh nhân thành công.");
        fetchPatients(); 
      } else {
        alert("❌ Có lỗi xảy ra khi xóa!");
      }
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 w-full">
      <div className="max-w-7xl mx-auto space-y-8 w-full relative">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">Quản lý Bệnh nhân</h1>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 shadow-md flex-1 md:flex-none">
              <UserPlus className="mr-2 h-4 w-4" /> Thêm mới
            </Button>
            
            <Button 
              onClick={() => signOut({ callbackUrl: '/login' })} 
              variant="outline" 
              className="text-red-500 border-red-200 hover:bg-red-50 hover:text-red-700 flex-none"
            >
              <LogOut className="h-4 w-4 md:mr-2" /> 
              <span className="hidden md:inline">Đăng xuất</span>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {patients.map((p: any) => (
            <Card key={p.id} className="hover:shadow-xl transition-all border-l-4 border-l-blue-500 bg-white group relative flex flex-col">
              
              <CardHeader className="pb-2 flex flex-row items-start justify-between space-y-0">
                <div className="overflow-hidden pr-2">
                  <CardTitle className="text-xl text-blue-800 truncate">{p.name}</CardTitle>
                  <p className="text-xs font-mono text-slate-400 mt-1">ID: {p.id}</p>
                </div>
                
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 shrink-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={() => handleDeletePatient(p.id, p.name)}
                  title="Xóa hồ sơ"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col justify-end">
                {/* ĐÃ THÊM MÃ TRUY CẬP Ở ĐÂY */}
                <div className="flex flex-wrap gap-2 text-sm mb-5">
                  <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-medium text-xs">Tuổi: {p.age}</span>
                  <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-medium text-xs">{p.gender}</span>
                  {p.accessCode && (
                    <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full font-bold text-xs tracking-wider border border-emerald-200">
                      Mã: {p.accessCode}
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start border-blue-100 text-blue-700 hover:bg-blue-600 hover:text-white transition-colors"
                    onClick={() => router.push(`/doctor/patient/${p.id}`)}
                  >
                    <Activity className="mr-2 h-4 w-4" /> Bắt đầu đo & chẩn đoán
                  </Button>
                  
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                    onClick={() => router.push(`/doctor/patient/${p.id}/history`)}
                  >
                    <History className="mr-2 h-4 w-4" /> Lịch sử phiên đo
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          
          <Card className="border-dashed border-2 border-slate-300 bg-transparent flex flex-col items-center justify-center min-h-[220px] hover:bg-slate-100 transition-colors cursor-pointer" onClick={() => setIsModalOpen(true)}>
              <UserPlus className="h-10 w-10 text-slate-400 mb-2" />
              <p className="text-slate-500 font-medium">Thêm hồ sơ mới</p>
          </Card>
        </div>

        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <Card className="w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 border-none">
              <CardHeader className="flex flex-row items-center justify-between bg-white rounded-t-xl border-b pb-4">
                <CardTitle className="text-lg text-blue-800">Hồ sơ bệnh nhân mới</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setIsModalOpen(false)} className="rounded-full hover:bg-red-50 hover:text-red-600">
                  <X className="h-5 w-5" />
                </Button>
              </CardHeader>
              <CardContent className="pt-6 bg-slate-50 rounded-b-xl">
                <form onSubmit={handleAddPatient} className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700">Mã bệnh nhân (ID)</label>
                    <input required placeholder="VD: BN-002" className="w-full p-2.5 border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 outline-none uppercase" 
                      value={newPatient.id} onChange={e => setNewPatient({...newPatient, id: e.target.value.toUpperCase()})} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700">Họ và tên</label>
                    <input required placeholder="Nhập tên đầy đủ" className="w-full p-2.5 border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      value={newPatient.name} onChange={e => setNewPatient({...newPatient, name: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-slate-700">Tuổi</label>
                      <input required type="number" min="1" max="150" className="w-full p-2.5 border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        value={newPatient.age} onChange={e => setNewPatient({...newPatient, age: e.target.value})} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-slate-700">Giới tính</label>
                      <select className="w-full p-2.5 border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white" 
                        value={newPatient.gender} onChange={e => setNewPatient({...newPatient, gender: e.target.value})}>
                        <option value="Nam">Nam</option>
                        <option value="Nữ">Nữ</option>
                        <option value="Khác">Khác</option>
                      </select>
                    </div>
                  </div>
                  <div className="pt-4 flex gap-3">
                    <Button type="button" variant="outline" className="flex-1 bg-white border-slate-300 hover:bg-slate-100" onClick={() => setIsModalOpen(false)}>Hủy bỏ</Button>
                    <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 shadow-md text-white">Lưu hồ sơ</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}