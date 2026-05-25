"use client"
import React, { useEffect, useState, useRef, use } from 'react';
import mqtt from 'mqtt';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Activity, Calendar, CheckCircle2, X, Video, Image as ImageIcon, LogOut, Camera, FileText, Mic } from "lucide-react";

// Voice feedback queue to prevent overlap (module level singleton)
let speechQueue: string[] = [];
let isSpeaking = false;
let speechInitialized = false;

function speak(text: string) {
  // Initialize speech system on first call (fix iOS/Safari requirement)
  if (!speechInitialized) {
    window.speechSynthesis.getVoices();
    speechInitialized = true;
  }
  speechQueue.push(text);
  processSpeechQueue();
}

function processSpeechQueue() {
  if (isSpeaking || speechQueue.length === 0) return;
  isSpeaking = true;
  const utterance = new SpeechSynthesisUtterance(speechQueue.shift()!);
  utterance.lang = 'vi-VN';
  utterance.rate = 0.9;
  utterance.pitch = 1.1;
  utterance.volume = 1;
  utterance.onend = () => {
    isSpeaking = false;
    processSpeechQueue();
  };
  utterance.onerror = () => {
    isSpeaking = false;
    processSpeechQueue();
  };
  window.speechSynthesis.speak(utterance);
}

export default function PatientDashboard({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [history, setHistory] = useState<any[]>([]); 
  const [viewingSession, setViewingSession] = useState<any>(null);
  const resolvedParams = use(params);
  const patientId = resolvedParams.id;

  const [isCamRequested, setIsCamRequested] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isPeerReady, setIsPeerReady] = useState(false);
  const peerRef = useRef<any>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const initGuardRef = useRef(false);

  useEffect(() => {
    const init = async () => {
      const { default: Peer } = await import('peerjs');
      
      const peer = new Peer(`PATIENT-${patientId}`, {
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            {
              urls: ['turn:free.expressturn.com:3478', 'turn:free.expressturn.com:443'],
              username: '0000000002092307355',
              credential: 'zlKyAPUVnuL/0C66pFDX/41zTxw=',
            },
          ],
          iceCandidatePoolSize: 10,
        },
      });
      peerRef.current = peer;
      peer.on('open', () => setIsPeerReady(true));
      peer.on('error', () => {}); // Silent error - retry on doctor side

      fetchHistory();
    };
    if (!initGuardRef.current) {
      initGuardRef.current = true;
      init();
    }

    return () => {
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
      if (peerRef.current) {
        peerRef.current.destroy();
        peerRef.current = null;
      }
    };
  }, [patientId]);

  const fetchHistory = async () => {
    const res = await fetch(`/api/sessions?patientId=${patientId}`);
    if (res.ok) setHistory(await res.json());
  };

  useEffect(() => {
    const client = mqtt.connect('wss://8b0913889a6742eb9501c5caf1b137eb.s1.eu.hivemq.cloud:8884/mqtt', { username: 'MiceBach', password: 'Kneejoint1@' });
    
    client.on('connect', () => {
      client.subscribe(`joint_monitor/${patientId}/request_cam`);
      client.subscribe(`joint_monitor/${patientId}/voice_cmd`);
    });
    client.on('message', (t, msg) => {
      const text = msg.toString();
      if (t === `joint_monitor/${patientId}/request_cam` && text === "START_CAM") {
        setIsCamRequested(true);
      }
      if (t === `joint_monitor/${patientId}/voice_cmd`) {
        speak(text);
      }
    });
    return () => { client.end(); };
  }, [patientId]);

  const placeCall = (stream: MediaStream) => {
    const doctorId = `DOCTOR-${patientId}`;
    const peer = peerRef.current;
    if (!peer) return;

    const dial = () => {
      const call = peer.call(doctorId, stream);
      call?.on('error', () => {}); // Silent - retry handled by doctor
    };

    if (peer.open && peer.id) dial();
    else peer.once('open', dial);
  };

  const bindLocalVideo = async (stream: MediaStream) => {
    const video = localVideoRef.current;
    if (!video) return false;
    video.srcObject = stream;
    video.muted = true;
    video.setAttribute('playsinline', 'true');
    try {
      await video.play();
      return true;
    } catch (err) {
      return false;
    }
  };

  useEffect(() => {
    if (!isStreaming || !localStreamRef.current) return;
    void bindLocalVideo(localStreamRef.current);
  }, [isStreaming]);

  const stopLocalStream = () => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
  };

  const handleAcceptCam = async () => {
    if (!isPeerReady) {
      alert('Đang khởi tạo kênh video, vui lòng đợi vài giây rồi thử lại.');
      return;
    }
    setIsCamRequested(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      });
      localStreamRef.current = stream;
      setIsStreaming(true);
      requestAnimationFrame(() => {
        void bindLocalVideo(stream);
      });
      placeCall(stream);
    } catch (err) {
      alert('Không mở được camera. Kiểm tra quyền trình duyệt.');
    }
  };

  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-screen max-w-5xl mx-auto font-sans pb-20">
      {isCamRequested && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[200] flex items-center justify-center p-6">
          <Card className="w-full max-w-sm rounded-3xl border-none shadow-2xl bg-white overflow-hidden animate-in zoom-in-95">
            <CardContent className="pt-10 pb-8 px-6 text-center">
              <div className="bg-blue-50 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6"><Video className="h-10 w-10 text-blue-600 animate-pulse" /></div>
              <h3 className="text-xl font-black text-slate-800 uppercase">Yêu cầu từ Bác sĩ</h3>
              <p className="text-slate-500 mt-4 text-sm italic">Bác sĩ muốn ghi hình lâm sàng trực tiếp.</p>
              <div className="flex flex-col gap-3 mt-10">
                <Button className="bg-blue-600 py-7 rounded-2xl font-black shadow-lg" onClick={handleAcceptCam} disabled={!isPeerReady}>ĐỒNG Ý VÀ MỞ CAM</Button>
                <Button variant="ghost" className="py-6 rounded-2xl font-bold" onClick={() => setIsCamRequested(false)}>TỪ CHỐI</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {isStreaming && (
        <div className="mb-8 rounded-[2.5rem] overflow-hidden bg-slate-950 shadow-2xl relative border-4 border-white aspect-[3/4] max-h-[500px] mx-auto animate-in fade-in">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover scale-x-[-1]"
          />
          <div className="absolute top-6 left-6 bg-red-600 text-white px-4 py-2 rounded-full text-[10px] font-black animate-pulse flex items-center gap-2">● TRUYỀN LIVE</div>
          <Button size="icon" variant="destructive" className="absolute top-6 right-6 rounded-2xl h-12 w-12" onClick={() => { stopLocalStream(); setIsStreaming(false); }}><X className="h-6 w-6"/></Button>
        </div>
      )}

      <div className="flex justify-between items-center bg-emerald-600 p-6 rounded-3xl shadow-xl shadow-emerald-100 mb-8 text-white">
        <div className="flex items-center gap-4">
          <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md"><Activity className="h-8 w-8" /></div>
          <div><h1 className="text-2xl font-black tracking-tighter uppercase italic">TMJ-History: {patientId}</h1><p className="text-emerald-100 text-[10px] font-bold uppercase opacity-80">Tele-Health System</p></div>
        </div>
        <Button variant="ghost" onClick={() => router.push('/patient')} className="text-white hover:bg-white/20 px-6 rounded-2xl font-bold border border-emerald-500/50">ĐĂNG XUẤT</Button>
      </div>

      {isStreaming && (
        <Card className="mb-6 border-2 border-blue-100 bg-blue-50 rounded-3xl overflow-hidden shadow-md">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="bg-blue-100 p-3 rounded-2xl"><Mic className="h-6 w-6 text-blue-600" /></div>
            <div>
              <p className="text-sm font-black text-blue-800 uppercase tracking-tight">ĐANG TRONG PHIÊN KHÁM</p>
              <p className="text-xs text-blue-600 mt-1">Làm theo hướng dẫn bằng giọng nói từ bác sĩ</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-6">
        <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4 px-2"><Calendar className="h-4 w-4 text-emerald-500"/> Nhật ký điều trị</h2>
        <div className="grid gap-5">
          {history.map((s, idx) => (
            <Card key={s.id} className="border-none shadow-sm rounded-3xl overflow-hidden hover:shadow-md transition-all">
               <CardHeader className="bg-white border-b flex flex-row items-center justify-between py-5 px-6">
                  <div className="flex items-center gap-4">
                    <div className="bg-emerald-50 p-2.5 rounded-2xl text-emerald-600"><CheckCircle2 className="h-5 w-5" /></div>
                    <div><CardTitle className="text-sm font-black">Phiên đo #{history.length - idx}</CardTitle><p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{new Date(s.startTime).toLocaleString('vi-VN')}</p></div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setViewingSession(s)} className="text-emerald-600 border-emerald-100 rounded-xl px-4 font-bold flex items-center gap-2 hover:bg-emerald-50">
                    <ImageIcon className="h-4 w-4" /> ẢNH LÂM SÀNG
                  </Button>
               </CardHeader>
               <CardContent className="p-5 bg-white"><div className="bg-slate-50 rounded-xl p-4 border border-slate-100"><p className="text-[9px] font-black text-emerald-700 uppercase mb-2">Ghi chú bác sĩ:</p><p className="text-sm text-slate-600 italic">"{s.doctorNotes || "Dữ liệu đang được phân tích."}"</p></div></CardContent>
            </Card>
          ))}
        </div>
      </div>

      {viewingSession && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-sm flex items-center justify-center z-[100] p-4 md:p-10">
           <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95">
              <div className="flex justify-between items-center px-8 py-6 border-b border-slate-100 shrink-0 bg-white">
                <h3 className="font-black text-lg md:text-xl flex items-center gap-3 text-blue-700 uppercase tracking-tighter"><Camera className="h-6 w-6"/> ẢNH CHẨN ĐOÁN</h3>
                <Button variant="ghost" onClick={() => setViewingSession(null)} className="rounded-full bg-slate-100 h-10 w-10 p-0"><X /></Button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 md:p-10">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    {[{ label: "MẶT TRÁI", img: viewingSession.imageLeft }, { label: "TRỰC DIỆN", img: viewingSession.imageFront }, { label: "MẶT PHẢI", img: viewingSession.imageRight }].map((item, i) => (
                    <div key={i} className="space-y-4 text-center">
                        <div className="bg-slate-100 rounded-3xl aspect-[3/4] overflow-hidden border-2 border-slate-100 shadow-inner flex items-center justify-center relative">
                        {item.img ? <img src={item.img} alt={item.label} className="w-full h-full object-cover" /> : <div className="text-center p-4"><ImageIcon className="h-10 w-10 text-slate-300 mx-auto mb-2" /><p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Chưa có ảnh</p></div>}
                        <div className="absolute bottom-4 left-4 right-4 bg-black/50 backdrop-blur-md text-white py-2 rounded-xl text-center text-[10px] font-black uppercase border border-white/20">{item.label}</div>
                        </div>
                    </div>
                    ))}
                </div>
              </div>
              <div className="p-6 md:p-8 border-t border-slate-100 bg-white shrink-0">
                <Button onClick={() => setViewingSession(null)} className="w-full bg-slate-900 text-white py-8 font-black uppercase tracking-widest rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-slate-200">ĐÓNG HÌNH ẢNH</Button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}