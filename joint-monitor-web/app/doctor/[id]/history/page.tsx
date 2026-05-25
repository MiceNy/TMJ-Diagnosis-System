"use client"

import { useEffect, useState, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, ScatterChart, Scatter, ZAxis, AreaChart, Area } from "recharts"

export default function PatientHistory() {
  const params = useParams()
  const router = useRouter()
  const patientId = params.id

  const [sessions, setSessions] = useState<any[]>([])
  const [selectedSession, setSelectedSession] = useState<any>(null)
  const [chartData, setChartData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch(`/api/sessions/${patientId}`)
        const data = await res.json()
        if (data && data.length > 0) {
          setSessions(data)
          setSelectedSession(data[0])
          setChartData(JSON.parse(data[0].sensorData))
        }
      } catch (error) {
        console.error("Lỗi tải lịch sử:", error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchHistory()
  }, [patientId])

  const handleSelectSession = (session: any) => {
    setSelectedSession(session)
    setChartData(JSON.parse(session.sensorData))
  }

  // ==============================================================
  // THUẬT TOÁN XỬ LÝ TÍN HIỆU SỐ (DFT) CHUYỂN SANG MIỀN TẦN SỐ
  // ==============================================================
  const spectrumData = useMemo(() => {
    if (!chartData || chartData.length === 0) return []
    
    const N = chartData.length
    const Fs = 100 // Tần số lấy mẫu hiện tại của chúng ta là 100Hz
    const spectrum = []
    
    // Theo định lý Nyquist, ta chỉ lấy một nửa phổ (tối đa 50Hz)
    const maxBins = Math.min(Math.floor(N / 2), 50) 

    for (let k = 0; k < maxBins; k++) {
      let sumReal = 0
      let sumImag = 0
      
      for (let n = 0; n < N; n++) {
        const angle = (2 * Math.PI * k * n) / N
        const val = chartData[n].audio || 0
        sumReal += val * Math.cos(angle)
        sumImag -= val * Math.sin(angle)
      }
      
      // Tính biên độ Magnitude
      const magnitude = (Math.sqrt(sumReal * sumReal + sumImag * sumImag) / N) * 2
      const frequency = (k * Fs) / N

      // Loại bỏ nhiễu DC ở 0Hz để biểu đồ rõ nét hơn
      if (frequency > 0.5) {
        spectrum.push({
          frequency: parseFloat(frequency.toFixed(1)),
          magnitude: Math.round(magnitude)
        })
      }
    }
    return spectrum
  }, [chartData])
  // ==============================================================

  if (isLoading) return <div className="p-8 text-center text-xl font-bold">Đang tải dữ liệu...</div>

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border">
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={() => router.push(`/doctor/${patientId}`)}>
              ← Trở về trang Real-time
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                Phân Tích Y Sinh: <span className="text-blue-600">{patientId}</span>
              </h1>
            </div>
          </div>
        </div>

        {sessions.length === 0 ? (
          <div className="bg-white p-8 text-center rounded-xl shadow-sm border text-slate-500">
            Chưa có hồ sơ lưu trữ nào.
          </div>
        ) : (
          <div className="flex flex-col md:flex-row gap-6">
            
            {/* CỘT BÊN TRÁI: DANH SÁCH */}
            <div className="w-full md:w-1/4 space-y-4">
              <h3 className="font-bold text-lg text-slate-800">Các phiên đã ghi:</h3>
              <div className="space-y-2 max-h-[800px] overflow-y-auto pr-2">
                {sessions.map((session, index) => {
                  const date = new Date(session.startTime)
                  const isSelected = selectedSession?.id === session.id
                  return (
                    <div 
                      key={session.id}
                      onClick={() => handleSelectSession(session)}
                      className={`p-4 rounded-lg border cursor-pointer transition-all ${
                        isSelected ? "bg-blue-50 border-blue-500 shadow-md" : "bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="font-semibold text-slate-800">Phiên {sessions.length - index}</div>
                      <div className="text-sm text-slate-500">{date.toLocaleDateString('vi-VN')} - {date.toLocaleTimeString('vi-VN')}</div>
                      <div className="mt-2 text-xs font-medium text-blue-600 bg-blue-100 inline-block px-2 py-1 rounded">
                        ⏱ {session.duration} giây
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* CỘT BÊN PHẢI: TỔNG HỢP BIỂU ĐỒ */}
            <div className="w-full md:w-3/4 grid grid-cols-1 xl:grid-cols-2 gap-6">
              
              {/* 1. ĐỘNG LỰC HỌC (GÓC GẬP) */}
              <Card className="shadow-md border-t-4 border-t-blue-500">
                <CardHeader className="pb-2">
                  <CardTitle>Động Lực Học (Góc Gập hàm)</CardTitle>
                </CardHeader>
                <CardContent style={{ height: 250, width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0"/>
                      <XAxis dataKey="time" minTickGap={50} tick={{fontSize: 10}} />
                      <YAxis domain={[-90, 90]} stroke="#94a3b8"/>
                      <Tooltip />
                      <Line type="monotone" isAnimationActive={false} dataKey="angle" stroke="#2563eb" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* 2. MIỀN THỜI GIAN (ÂM THANH THÔ) */}
              <Card className="shadow-md border-t-4 border-t-rose-500">
                <CardHeader className="pb-2">
                  <CardTitle>Miền Thời Gian (Cường Độ Âm)</CardTitle>
                </CardHeader>
                <CardContent style={{ height: 250, width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0"/>
                      <XAxis dataKey="time" minTickGap={50} tick={{fontSize: 10}} />
                      <YAxis domain={['auto', 'auto']} stroke="#94a3b8"/>
                      <Tooltip />
                      <Line type="monotone" isAnimationActive={false} dataKey="audio" stroke="#e11d48" strokeWidth={1.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* 3. TƯƠNG QUAN ĐỘNG LỰC (SCATTER PLOT) */}
              <Card className="shadow-md border-t-4 border-t-purple-500">
                <CardHeader className="pb-2">
                  <CardTitle>Điểm Cọ Xát (Góc vs Âm Thanh)</CardTitle>
                </CardHeader>
                <CardContent style={{ height: 250, width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis type="number" dataKey="angle" name="Góc gập" unit="°" tick={{fontSize: 12}} />
                      <YAxis type="number" dataKey="audio" name="Biên độ" tick={{fontSize: 12}} />
                      <ZAxis type="number" range={[15, 15]} /> 
                      <Tooltip 
                        cursor={{ strokeDasharray: '3 3' }} 
                        formatter={((value: any, name: any) => [
                          value, 
                          name === 'angle' ? 'Góc' : 'Âm thanh'
                        ]) as any} 
                      />
                      <Scatter name="Ma sát" data={chartData} fill="#8b5cf6" fillOpacity={0.6} />
                    </ScatterChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* 4. TRÙM CUỐI: MIỀN TẦN SỐ (PHỔ FFT) */}
              <Card className="shadow-md border-t-4 border-t-emerald-500">
                <CardHeader className="pb-2">
                  <CardTitle>Phân Tích Miền Tần Số (Phổ FFT)</CardTitle>
                  <CardDescription>Đỉnh phổ nhọn = Rắc sinh lý | Phổ bè rộng = Lạo xạo thoái hóa</CardDescription>
                </CardHeader>
                <CardContent style={{ height: 250, width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={spectrumData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0"/>
                      <XAxis 
                        dataKey="frequency" 
                        name="Tần số" 
                        unit=" Hz" 
                        tick={{fontSize: 10}} 
                        tickMargin={5}
                      />
                      <YAxis stroke="#94a3b8"/>
                      <Tooltip formatter={((value: any, name: any) => [
                        value,
                        'Biên độ'
                      ]) as any} />
                      <Area type="monotone" dataKey="magnitude" stroke="#10b981" fill="#10b981" fillOpacity={0.3} isAnimationActive={true} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

            </div>
          </div>
        )}
      </div>
    </div>
  )
}