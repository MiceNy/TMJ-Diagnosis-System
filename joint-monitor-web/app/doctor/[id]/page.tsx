"use client"

import { useEffect, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import mqtt from "mqtt"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts"

export default function PatientDetail() {
  const params = useParams()
  const router = useRouter()
  const patientId = params.id

  // ⚠️ ĐẢM BẢO ĐÚNG IP MÁY TÍNH CỦA BẠN
  const MQTT_BROKER_URL = "ws://192.168.1.22:9001" 

  const [sensorData, setSensorData] = useState<any[]>([])
  const [connectStatus, setConnectStatus] = useState("Đang kết nối trạm...")
  const [statusColor, setStatusColor] = useState("text-yellow-600 bg-yellow-100")
  
  const [aiDiagnosis, setAiDiagnosis] = useState<number | null>(null)

  // State quản lý UI nút bấm
  const [isRecordingUI, setIsRecordingUI] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Ref dùng để hứng dữ liệu ngầm tốc độ cao (100Hz) mà không làm đơ Web
  const mqttClientRef = useRef<any>(null)
  const isRecordingRef = useRef(false)
  const sessionBufferRef = useRef<any[]>([])
  const startTimeRef = useRef<number>(0)

  useEffect(() => {
    if (mqttClientRef.current) return

    mqttClientRef.current = mqtt.connect(MQTT_BROKER_URL, {
        keepalive: 60,
        reconnectPeriod: 1000,
    })

    const client = mqttClientRef.current

    client.on("connect", () => {
      setConnectStatus("Đã kết nối! Đợi dữ liệu...")
      setStatusColor("text-green-600 bg-green-100")
      client.subscribe("joint_monitor/data")
    })

    client.on("message", (topic: string, message: any) => {
      try {
        const rawData = JSON.parse(message.toString())
        
         if (rawData.ai_status !== undefined) {
          setAiDiagnosis(rawData.ai_status)
        }

        setConnectStatus("Đang nhận dữ liệu Real-time (100Hz)")
        setStatusColor("text-blue-600 bg-blue-100")

        const newDataPoint = {
          time: new Date().toLocaleTimeString('vi-VN', { fractionalSecondDigits: 2 }),
          angle: rawData.angle,
          audio: rawData.audio
        }

        // 1. Luôn cập nhật biểu đồ trượt trên màn hình (tối đa 60 điểm)
        setSensorData((prevData) => {
          const updatedData = [...prevData, newDataPoint]
          if (updatedData.length > 60) updatedData.shift() 
          return updatedData
        })

        // 2. NẾU ĐANG BẤM NÚT GHI: Nhét thêm dữ liệu vào "túi" ẩn (không giới hạn số lượng)
        if (isRecordingRef.current) {
          sessionBufferRef.current.push(newDataPoint)
        }

      } catch (error) {
        console.error("Lỗi đọc dữ liệu:", error)
      }
    })

    client.on("error", (err: any) => {
      setConnectStatus("Lỗi kết nối MQTT!")
      setStatusColor("text-red-600 bg-red-100")
    })

    return () => {
      if (mqttClientRef.current) {
        mqttClientRef.current.end()
        mqttClientRef.current = null
      }
    }
  }, [])

  // ==========================================
  // HÀM XỬ LÝ GHI DỮ LIỆU
  // ==========================================
  const handleStartRecording = () => {
    isRecordingRef.current = true      // Bật cờ hứng dữ liệu ngầm
    sessionBufferRef.current = []      // Làm sạch túi hứng
    startTimeRef.current = Date.now()  // Bấm giờ
    setIsRecordingUI(true)             // Đổi màu nút trên màn hình
  }

  const handleStopAndSave = async () => {
    isRecordingRef.current = false     // Tắt cờ hứng dữ liệu
    setIsRecordingUI(false)
    setIsSaving(true)                  // Hiện trạng thái đang lưu

    // Tính toán thời lượng (giây) và lấy toàn bộ dữ liệu trong túi ra
    const duration = Math.floor((Date.now() - startTimeRef.current) / 1000)
    const dataToSave = sessionBufferRef.current

    if (dataToSave.length === 0) {
      alert("Không có dữ liệu nào được ghi lại!")
      setIsSaving(false)
      return
    }

    try {
      // Gửi nguyên kiện hàng sang Cổng API chúng ta vừa tạo ở bước trước
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: patientId,
          duration: duration,
          sensorData: dataToSave,
          notes: "Ghi âm lạo xạo khớp lúc vận động" // Tạm thời hardcode, sau này cho bác sĩ tự gõ
        })
      })

      if (response.ok) {
        alert(`✅ Đã lưu thành công hồ sơ khám!\nThời gian: ${duration} giây\nTổng số điểm đo: ${dataToSave.length} điểm`)
      } else {
        alert("❌ Lỗi khi lưu vào Database!")
      }
    } catch (error) {
      alert("❌ Lỗi kết nối đến Server!")
    } finally {
      setIsSaving(false)
      sessionBufferRef.current = [] // Xóa túi để chuẩn bị cho lần khám sau
    }
  }

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* THANH ĐIỀU KHIỂN BÊN TRÊN */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border">
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={() => router.push('/doctor')}>
              ← Danh sách
            </Button>
            
            {/* NÚT CHUYỂN NHANH SANG TRANG LỊCH SỬ */}
            <Button 
              variant="default" 
              onClick={() => router.push(`/doctor/${patientId}/history`)}
              className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
            >
              🕒 Xem Lịch sử
            </Button>

            <div className="ml-4">
              <h1 className="text-2xl font-bold text-slate-800">
                Bệnh nhân: <span className="text-blue-600">{patientId}</span>
              </h1>
              <div className={`mt-1 inline-flex px-3 py-1 rounded-full text-xs font-semibold items-center space-x-2 ${statusColor}`}>
                <span className="relative flex h-2 w-2">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${statusColor.split(' ')[1]}`}></span>
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${statusColor.split(' ')[0].replace('text-', 'bg-')}`}></span>
                </span>
                <span>{connectStatus}</span>
              </div>
            </div>
                    
          {/* 👉 BỔ SUNG THẺ CẢNH BÁO AI VÀO ĐÂY */}
            {aiDiagnosis !== null && (
              <div className={`ml-6 px-4 py-2 rounded-lg border-2 font-bold flex items-center shadow-sm animate-pulse
                ${aiDiagnosis === 0 ? "bg-green-50 border-green-500 text-green-700" : 
                  aiDiagnosis === 1 ? "bg-yellow-50 border-yellow-500 text-yellow-700" : 
                  aiDiagnosis === 2 ? "bg-orange-50 border-orange-500 text-orange-700" :
                  aiDiagnosis === 3 ? "bg-red-50 border-red-500 text-red-900" :
                  "bg-slate-50 border-slate-400 text-slate-600"}`}
              >
                {aiDiagnosis === 0 ? "✅ AI: TMJ Bình thường" : 
                 aiDiagnosis === 1 ? "⚠️ AI: Tiếng Click / Lục cục" : 
                 aiDiagnosis === 2 ? "🚨 AI: Tiếng lạo xạo (Crepitus)" :
                 aiDiagnosis === 3 ? "❌ AI: Thoái hóa nặng / Tiếng rắc" :
                 "? AI: Không xác định"}
              </div>
            )}

          </div>

          {/* CỤM NÚT BẤM GHI HÌNH */}
          <div className="flex items-center space-x-3 bg-slate-100 p-2 rounded-lg border">
            {!isRecordingUI ? (
              <Button 
                onClick={handleStartRecording} 
                disabled={isSaving || !connectStatus.includes("100Hz")}
                className="bg-red-500 hover:bg-red-600 text-white font-bold w-40"
              >
                <span className="mr-2 text-lg">⏺</span> BẮT ĐẦU GHI
              </Button>
            ) : (
              <Button 
                onClick={handleStopAndSave} 
                className="bg-slate-800 hover:bg-slate-900 text-white font-bold w-40 animate-pulse"
              >
                <span className="mr-2 text-lg">⏹</span> KẾT THÚC & LƯU
              </Button>
            )}
            
            {isSaving && <span className="text-sm font-medium text-blue-600 animate-bounce">Đang lưu vào CSDL...</span>}
            {isRecordingUI && <span className="text-sm font-medium text-red-500 animate-pulse">🔴 Đang thu thập dữ liệu...</span>}
          </div>
        </div>

        {/* CỤM BIỂU ĐỒ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="shadow-md border-t-4 border-t-blue-500">
            <CardHeader className="pb-2">
              <CardTitle>Góc Gập hàm (MPU6050)</CardTitle>
            </CardHeader>
            <CardContent style={{ height: 350, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sensorData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0"/>
                  <XAxis dataKey="time" tick={{fontSize: 10}} tickMargin={10} interval={10}/>
                  <YAxis domain={[-15, 15]} stroke="#94a3b8"/>
                  <Tooltip animationDuration={100} />
                  <Line type="monotone" isAnimationActive={false} dataKey="angle" stroke="#2563eb" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="shadow-md border-t-4 border-t-rose-500">
            <CardHeader className="pb-2">
              <CardTitle>Âm Thanh Ma Sát (I2S MEMS)</CardTitle>
            </CardHeader>
            <CardContent style={{ height: 350, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sensorData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0"/>
                  <XAxis dataKey="time" tick={{fontSize: 10}} tickMargin={10} interval={10}/>
                  <YAxis domain={[-30000, 30000]} stroke="#94a3b8"/>
                  <Tooltip animationDuration={100}/>
                  <Line type="monotone" isAnimationActive={false} dataKey="audio" stroke="#e11d48" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  )
}