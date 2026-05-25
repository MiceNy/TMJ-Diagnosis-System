"use client"
import React, { useEffect, useState, use } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { ArrowLeft, Activity, History as HistoryIcon, X, FileText, Trash2, Save, PenLine, Bot, Camera } from "lucide-react";
import { getTmjAiUI, getTmjOverallStatusFromCounts } from "@/lib/tmj-ai-status";

export default function PatientHistory({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [history, setHistory] = useState<any[]>([]); 
  const [viewingSession, setViewingSession] = useState<any>(null); 
  const [doctorNote, setDoctorNote] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);
  
  const resolvedParams = use(params);
  const patientId = resolvedParams.id;

  const fetchHistory = async () => {
    try {
      const res = await fetch(`/api/sessions?patientId=${patientId}`);
      if (res.ok) setHistory(await res.json());
    } catch (error) {
      console.error("Lỗi lấy lịch sử:", error);
    }
  };

  useEffect(() => { fetchHistory(); }, [patientId]);

  useEffect(() => {
    if (viewingSession) {
      setDoctorNote(viewingSession.doctorNotes || "");
    }
  }, [viewingSession]);

  const handleDeleteSession = async (sessionId: string) => {
    if (window.confirm("⚠️ Bạn có chắc muốn xóa vĩnh viễn phiên đo này không?")) {
      try {
        const res = await fetch(`/api/sessions/${sessionId}`, { method: 'DELETE' });
        if (res.ok) fetchHistory(); 
        else alert("Lỗi không thể xóa!");
      } catch (e) { console.error(e); }
    }
  };

  const handleSaveNote = async () => {
    if (!viewingSession) return;
    setIsSavingNote(true);
    try {
      const res = await fetch(`/api/sessions/${viewingSession.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doctorNotes: doctorNote })
      });
      if (res.ok) {
        alert("✅ Đã lưu đánh giá y khoa thành công!");
        fetchHistory(); 
        setViewingSession({ ...viewingSession, doctorNotes: doctorNote }); 
      } else {
        alert("❌ Lỗi khi lưu đánh giá.");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSavingNote(false);
    }
  };

  const modalChartData = React.useMemo(() => {
    if (!viewingSession) return [];
    const rawData = typeof viewingSession.sensorData === 'string' ? JSON.parse(viewingSession.sensorData) : viewingSession.sensorData;
    return rawData.map((d: any, i: number) => ({ ...d, index: i }));
  }, [viewingSession]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded shadow-lg text-sm">
          <p className="text-slate-500 font-mono mb-1">Thời gian: {payload[0].payload.time}</p>
          {payload.map((p: any) => (
            <p key={p.dataKey} style={{ color: p.color }} className="font-bold">
              {p.name === 'angle' ? 'Góc gập' : 'Âm thanh'}: {p.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-screen relative max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-4 bg-white p-4 rounded-xl shadow-sm mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.push('/doctor')} className="rounded-full shadow-sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
              <HistoryIcon className="h-6 w-6 text-blue-600" />
              Lịch sử khám: <span className="text-blue-600 uppercase font-mono ml-1">{patientId}</span>
            </h1>
          </div>
        </div>
        <Button onClick={() => router.push(`/doctor/patient/${patientId}`)} className="bg-blue-600 hover:bg-blue-700">
          <Activity className="mr-2 h-4 w-4" /> Đo phiên mới
        </Button>
      </div>

      <Card className="shadow-sm border-none">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-100 text-slate-500 uppercase text-[10px] font-bold tracking-wider border-b">
                <tr>
                  <th className="px-6 py-4 rounded-tl-xl">Thời gian khám</th>
                  <th className="px-6 py-4">Số mẫu</th>
                  <th className="px-6 py-4">AI ghi nhận</th>
                  <th className="px-6 py-4">Ghi chú Bác sĩ</th>
                  <th className="px-6 py-4 text-right rounded-tr-xl">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map((s:any) => {
                  const overallStatus = getTmjOverallStatusFromCounts(s);
                  const ai = getTmjAiUI(overallStatus);

                  return (
                  <tr key={s.id} className="hover:bg-blue-50 transition-colors bg-white">
                    <td className="px-6 py-4 font-medium text-slate-700">{new Date(s.startTime).toLocaleString('vi-VN')}</td>
                    <td className="px-6 py-4 font-mono text-blue-600 font-bold">{JSON.parse(s.sensorData).length} mẫu</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${ai.bg} ${ai.textCol} ${ai.border} flex items-center w-fit gap-1.5`}>
                        {ai.icon} {ai.short}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {s.doctorNotes ? (
                         <span className="text-slate-600 truncate max-w-[150px] inline-block" title={s.doctorNotes}>{s.doctorNotes}</span>
                      ) : (
                         <span className="text-slate-400 text-xs italic">Chưa ghi chú</span>
                      )}
                    </td>
                    <td className="px-6 py-4 flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setViewingSession(s)} className="text-blue-600 font-bold hover:bg-blue-100">
                        <FileText className="h-4 w-4 mr-1" /> Chi tiết
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteSession(s.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                )})}
                {history.length === 0 && (
                   <tr><td colSpan={5} className="text-center py-10 text-slate-400 bg-white rounded-b-xl">Bệnh nhân này chưa có dữ liệu lịch sử nào.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* MODAL CHI TIẾT */}
      {viewingSession && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 md:p-8">
          <div className="w-full max-w-6xl h-full max-h-[95vh] bg-slate-100 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            
            <div className="bg-slate-800 text-white px-6 py-4 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-4">
                <div className="bg-white/20 p-2.5 rounded-lg"><FileText className="h-6 w-6 text-white" /></div>
                <div>
                  <h2 className="text-xl font-black uppercase tracking-wider text-blue-400">Hồ sơ đo chẩn đoán</h2>
                  <p className="text-slate-300 text-sm mt-0.5">Bác sĩ xem lại và ghi chú y khoa</p>
                </div>
              </div>
              <Button variant="ghost" onClick={() => setViewingSession(null)} className="text-slate-300 hover:text-white hover:bg-white/20 rounded-full h-10 w-10 p-0"><X className="h-6 w-6" /></Button>
            </div>
            
            <div id="print-section" className="flex-1 overflow-y-auto p-4 md:p-8">
              <div className="max-w-5xl mx-auto bg-white border border-slate-200 shadow-sm rounded-xl p-6 space-y-6">
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pb-6 border-b-2 border-dashed border-slate-200">
                  <div><p className="text-xs text-slate-400 uppercase font-bold mb-1">Bệnh nhân</p><p className="text-xl font-black text-blue-700 uppercase">{patientId}</p></div>
                  <div><p className="text-xs text-slate-400 uppercase font-bold mb-1">Thời gian</p><p className="text-sm font-bold text-slate-800">{new Date(viewingSession.startTime).toLocaleString('vi-VN')}</p></div>
                  <div><p className="text-xs text-slate-400 uppercase font-bold mb-1">Dữ liệu</p><p className="text-sm font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full w-fit">{JSON.parse(viewingSession.sensorData).length} mẫu</p></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* AI KẾT LUẬN */}
                  <div className="bg-[#f4fbf6] border border-[#d4ecd9] p-5 rounded-xl flex flex-col h-full shadow-sm">
                    <h3 className="text-[15px] font-bold text-[#116530] mb-3 flex items-center gap-2 uppercase">
                      <Bot className="h-5 w-5" /> KẾT LUẬN CỦA HỆ THỐNG AI
                    </h3>
                    <p className="text-[#116530] text-sm mb-4 font-medium">Trong toàn bộ quá trình đo, hệ thống ghi nhận:</p>
                    <ul className="space-y-3 text-[16px] font-semibold text-[#116530] mt-1">
                      <li className="flex items-center gap-3">
                        <span className="bg-[#5cb85c] text-white rounded w-6 h-6 flex items-center justify-center text-xs">✓</span> 
                        Bình thường: 
                        <span className="ml-auto font-bold">{viewingSession.aiNormal || 0} lần</span>
                      </li>
                      <li className="flex items-center gap-3">
                         <span className="bg-[#f0ad4e] text-white rounded w-6 h-6 flex items-center justify-center text-sm font-bold">⚠</span> 
                         Dấu hiệu Tiếng Click (Clicking): 
                         <span className="ml-auto text-[#f0ad4e] font-bold">{viewingSession.aiArthritis || 0} lần</span>
                      </li>
                      <li className="flex items-center gap-3">
                         <span className="bg-[#d9534f] text-white rounded w-6 h-6 flex items-center justify-center text-sm font-bold">!</span>
                         Dấu hiệu Tiếng lạo xạo (Crepitus): 
                         <span className="ml-auto text-[#d9534f] font-bold">{viewingSession.aiDegeneration || 0} lần</span>
                      </li>
                      <li className="flex items-center gap-3">
                         <span className="bg-red-900 text-white rounded w-6 h-6 flex items-center justify-center text-xs font-bold">❌</span>
                         Thoái hóa nặng / Tiếng rắc: 
                         <span className="ml-auto text-red-900 font-bold">{viewingSession.aiSevere || 0} lần</span>
                      </li>
                    </ul>
                  </div>

                  {/* BÁC SĨ GHI CHÚ */}
                  <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 flex flex-col h-full">
                    <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2"><PenLine className="h-4 w-4" /> GHI CHÚ Y KHOA (BÁC SĨ)</h3>
                    <textarea 
                      value={doctorNote}
                      onChange={(e) => setDoctorNote(e.target.value)}
                      placeholder="Nhập nhận xét chuyên môn, đánh giá lâm sàng, hướng điều trị..."
                      className="w-full flex-1 p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 text-sm resize-none"
                    />
                    <div className="flex justify-end mt-3">
                      <Button onClick={handleSaveNote} disabled={isSavingNote} className="bg-blue-600 hover:bg-blue-700 shadow-sm text-sm h-9">
                        {isSavingNote ? "Đang lưu..." : <><Save className="w-4 h-4 mr-2" /> Cập nhật ghi chú</>}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* --- KHU VỰC MỚI: HIỂN THỊ HÌNH ẢNH AI ĐÃ CHỤP --- */}
                {(viewingSession.imageFront || viewingSession.imageLeft || viewingSession.imageRight) && (
                  <div className="pt-4 pb-2 border-t border-slate-100">
                    <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2 uppercase">
                      <Camera className="h-5 w-5 text-blue-500" /> Hình ảnh nhận diện lâm sàng
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      
                      {/* Ảnh góc Trái */}
                      <div className="bg-slate-100 rounded-xl overflow-hidden border border-slate-200 aspect-[4/3] flex items-center justify-center relative shadow-inner">
                        {viewingSession.imageLeft ? (
                          <img src={viewingSession.imageLeft} alt="Góc mặt trái" className="w-full h-full object-cover" />
                        ) : <span className="text-slate-400 text-xs font-medium">Không có dữ liệu</span>}
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 text-white px-4 py-1.5 rounded-full text-[10px] font-bold uppercase backdrop-blur-sm tracking-widest shadow-md">
                          Góc Trái
                        </div>
                      </div>

                      {/* Ảnh Trực diện */}
                      <div className="bg-slate-100 rounded-xl overflow-hidden border border-slate-200 aspect-[4/3] flex items-center justify-center relative shadow-inner">
                        {viewingSession.imageFront ? (
                          <img src={viewingSession.imageFront} alt="Trực diện" className="w-full h-full object-cover" />
                        ) : <span className="text-slate-400 text-xs font-medium">Không có dữ liệu</span>}
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 text-white px-4 py-1.5 rounded-full text-[10px] font-bold uppercase backdrop-blur-sm tracking-widest shadow-md">
                          Trực diện
                        </div>
                      </div>

                      {/* Ảnh góc Phải */}
                      <div className="bg-slate-100 rounded-xl overflow-hidden border border-slate-200 aspect-[4/3] flex items-center justify-center relative shadow-inner">
                        {viewingSession.imageRight ? (
                          <img src={viewingSession.imageRight} alt="Góc mặt phải" className="w-full h-full object-cover" />
                        ) : <span className="text-slate-400 text-xs font-medium">Không có dữ liệu</span>}
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 text-white px-4 py-1.5 rounded-full text-[10px] font-bold uppercase backdrop-blur-sm tracking-widest shadow-md">
                          Góc Phải
                        </div>
                      </div>

                    </div>
                  </div>
                )}

                {/* BIỂU ĐỒ GÓC GẬP */}
                <div className="pt-4 border-t border-slate-100">
                  <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2 uppercase"><Activity className="h-5 w-5 text-blue-500" /> Biến thiên Góc gập hàm</h3>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100" style={{ width: '100%', height: 250 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={modalChartData} syncId="history" margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="index" hide />
                        <YAxis domain={[-10, 180]} tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} width={50} />
                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#94a3b8', strokeWidth: 2, strokeDasharray: '5 5' }} />
                        <Line type="monotone" dataKey="angle" stroke="#2563eb" strokeWidth={2.5} dot={false} activeDot={{ r: 6, fill: '#2563eb', stroke: '#fff', strokeWidth: 2 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* BIỂU ĐỒ ÂM THANH */}
                <div>
                  <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2 uppercase"><Activity className="h-5 w-5 text-purple-500" /> Tín hiệu Âm thanh</h3>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100" style={{ width: '100%', height: 250 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={modalChartData} syncId="history" margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="index" hide />
                        <YAxis domain={['auto', 'auto']} tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} width={50} />
                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#94a3b8', strokeWidth: 2, strokeDasharray: '5 5' }} />
                        <Line type="monotone" dataKey="audio" stroke="#9333ea" strokeWidth={2} dot={false} activeDot={{ r: 6, fill: '#9333ea', stroke: '#fff', strokeWidth: 2 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}