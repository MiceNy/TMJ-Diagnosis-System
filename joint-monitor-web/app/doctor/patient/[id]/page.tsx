"use client"
import React, { useEffect, useState, useRef, use } from 'react';
import mqtt from 'mqtt';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { ArrowLeft, Activity, Save, Loader2, History, Wifi, Camera, CheckCircle2, Video, Unlock, Zap, ShieldCheck, Mic, Play } from "lucide-react";
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';
import { uploadTmjSessionImages } from '@/lib/upload-image-supabase';
import { getTmjAiUI } from '@/lib/tmj-ai-status';

const SNAP_MAX_WIDTH = 1920;
const STABILITY_KP_INDICES = [1, 33, 13, 14, 152, 263];
const STABILITY_MAX_DELTA_PX = 2;
const STABILITY_FRAME_COUNT = 3;
const MOUTH_MIN_RATIO = 0.22;
const BURST_DURATION_MS = 1000;
const BURST_MAX_SAMPLES = 5;
const MEASURE_DURATION_SEC = 25;
const RETRY_MAX = 3;

type KpSnapshot = { x: number; y: number }[];

function snapVideoFrame(video: HTMLVideoElement): string | null {
  if (!video.videoWidth || !video.videoHeight) return null;
  const scale = Math.min(1, SNAP_MAX_WIDTH / video.videoWidth);
  const c = document.createElement('canvas');
  c.width = Math.round(video.videoWidth * scale);
  c.height = Math.round(video.videoHeight * scale);
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(video, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.95);
}

function extractKpSnapshot(keypoints: { x: number; y: number }[]): KpSnapshot {
  return STABILITY_KP_INDICES.map((i) => ({ x: keypoints[i].x, y: keypoints[i].y }));
}

function maxKpDelta(a: KpSnapshot, b: KpSnapshot): number {
  let max = 0;
  for (let i = 0; i < a.length; i++) {
    max = Math.max(max, Math.abs(a[i].x - b[i].x), Math.abs(a[i].y - b[i].y));
  }
  return max;
}

function isHeadStable(history: KpSnapshot[]): boolean {
  if (history.length < STABILITY_FRAME_COUNT) return false;
  const recent = history.slice(-STABILITY_FRAME_COUNT);
  return (
    maxKpDelta(recent[0], recent[1]) <= STABILITY_MAX_DELTA_PX &&
    maxKpDelta(recent[1], recent[2]) <= STABILITY_MAX_DELTA_PX
  );
}

function getMouthOpenRatio(keypoints: { x: number; y: number }[]): number {
  const upper = keypoints[13];
  const lower = keypoints[14];
  const mouthGap = Math.hypot(upper.x - lower.x, upper.y - lower.y);
  const faceHeight = Math.abs(keypoints[1].y - keypoints[152].y) + 0.1;
  return mouthGap / faceHeight;
}

function measureFrameSharpness(video: HTMLVideoElement): number {
  const size = 128;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  if (!ctx || !video.videoWidth) return 0;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  const sx = Math.max(0, (video.videoWidth - size) / 2);
  const sy = Math.max(0, (video.videoHeight - size) / 2);
  ctx.drawImage(video, sx, sy, size, size, 0, 0, size, size);
  const { data } = ctx.getImageData(0, 0, size, size);
  let sum = 0;
  let sumSq = 0;
  const n = data.length / 4;
  for (let i = 0; i < data.length; i += 4) {
    const g = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    sum += g;
    sumSq += g * g;
  }
  const mean = sum / n;
  return sumSq / n - mean * mean;
}

function matchesCapturePose(stage: string, yaw: number, mouthRatio: number): boolean {
  if (mouthRatio < MOUTH_MIN_RATIO) return false;
  if (stage === 'FRONT') return yaw > 0.5 && yaw < 1.5;
  if (stage === 'LEFT') return yaw > 2.0;
  if (stage === 'RIGHT') return yaw < 0.4;
  return false;
}

function playShutterSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 800;
    osc.type = 'square';
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.12);
  } catch (e) {}
}

export default function PatientDetailMonitor({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const patientId = resolvedParams.id;

  const [data, setData] = useState<any[]>([]); 
  const [currentAiStatus, setCurrentAiStatus] = useState(0);
  const [isMqttConnected, setIsMqttConnected] = useState(false);
  const [isDeviceOnline, setIsDeviceOnline] = useState(false);
  const [isDeviceLockedByMe, setIsDeviceLockedByMe] = useState(false);
  const [isRecording, setIsRecording] = useState(false); 
  const [isSaving, setIsSaving] = useState(false);
  const [inputDeviceId, setInputDeviceId] = useState("");
  const [activeDeviceId, setActiveDeviceId] = useState("");
  const [aiMessage, setAiMessage] = useState("Chờ kết nối...");
  const [capturedImages, setCapturedImages] = useState<any>({ front: null, left: null, right: null });
  const [measureTimer, setMeasureTimer] = useState(0);
  const [isMeasuring, setIsMeasuring] = useState(false);

  const recordingDataRef = useRef<any[]>([]);
  const isRecordingRef = useRef(false);
  const isSavingRef = useRef(false); 
  const mqttClientRef = useRef<any>(null);
  const lastSeenRef = useRef<number>(0);
  const hasAttemptedLockRef = useRef(false);
  const imagesRef = useRef({ front: null as string | null, right: null as string | null, left: null as string | null });
  const captureStageRef = useRef("IDLE");
  const lastCaptureTimeRef = useRef(0);
  const modelRef = useRef<any>(null);
  const modelInitGuardRef = useRef(false);
  const peerRetryRef = useRef(0);
  const measureTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [model, setModel] = useState<any>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isPeerReady, setIsPeerReady] = useState(false);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<any>(null);
  const faceDetectActiveRef = useRef(false);
  const kpHistoryRef = useRef<KpSnapshot[]>([]);
  const burstCaptureRef = useRef<{
    stage: string;
    startedAt: number;
    samples: { score: number; img: string }[];
  } | null>(null);
  const [isScanningSharpness, setIsScanningSharpness] = useState(false);
  const [captureFlash, setCaptureFlash] = useState(false);

  const realtimeChartData = data.map((d, i) => ({ ...d, index: i }));

  const sendVoiceToPatient = (text: string) => {
    if (mqttClientRef.current && isDeviceLockedByMe) {
      mqttClientRef.current.publish(`joint_monitor/${patientId}/voice_cmd`, text);
    }
  };

  const ICE_SERVERS: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    {
      urls: ['turn:free.expressturn.com:3478', 'turn:free.expressturn.com:443'],
      username: '0000000002092307355',
      credential: 'zlKyAPUVnuL/0C66pFDX/41zTxw=',
    },
  ];

  // =========== FIX: TFJS single initialization ===========
  useEffect(() => {
    let disposed = false;
    const init = async () => {
      if (modelInitGuardRef.current) return;
      modelInitGuardRef.current = true;
      
      // =========== FIX TFJS: Check backend before initializing ===========
      if (!tf.getBackend()) {
        await tf.setBackend('webgl');
      }
      await tf.ready();
      if (disposed) return;
      const detector = await faceLandmarksDetection.createDetector(
        faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh,
        { runtime: 'tfjs', refineLandmarks: false, maxFaces: 1 }
      );
      if (disposed) { detector.dispose?.(); return; }
      modelRef.current = detector;
      setModel(detector);

      // =========== FIX: PeerJS with retry ===========
      const { default: Peer } = await import('peerjs');
      const peer = new Peer(`DOCTOR-${patientId}`, {
        config: { iceServers: ICE_SERVERS, iceCandidatePoolSize: 10 },
      });
      peerRef.current = peer;

      peer.on('open', () => { if (!disposed) { setIsPeerReady(true); peerRetryRef.current = 0; } });
      peer.on('call', (call) => {
        call.answer();
        call.on('stream', (s) => {
          setRemoteStream((prev) => {
            prev?.getTracks().forEach((t) => t.stop());
            return s;
          });
          captureStageRef.current = 'FRONT';
          setAiMessage('Đã nối camera. Nhìn thẳng và há miệng nhẹ.');
        });
        call.on('close', () => {
          setRemoteStream(null);
          captureStageRef.current = 'IDLE';
        });
      });
      // =========== FIX: Auto-retry PeerJS 3 times ===========
      peer.on('error', () => {
        if (peerRetryRef.current < RETRY_MAX && !disposed) {
          peerRetryRef.current++;
          setTimeout(() => {
            if (!disposed && peerRef.current) {
              peerRef.current.destroy();
              peerRef.current = null;
              init(); // Re-init
            }
          }, 2000 * peerRetryRef.current);
        } else {
          setAiMessage('Không thể kết nối PeerJS sau 3 lần thử.');
        }
      });
    };

    init();
    const watchdog = setInterval(() => {
      if (lastSeenRef.current > 0 && Date.now() - lastSeenRef.current > 4000)
        setIsDeviceOnline(false);
    }, 2000);

    return () => {
      disposed = true;
      faceDetectActiveRef.current = false;
      clearInterval(watchdog);
      setIsPeerReady(false);
      // =========== FIX: Force cleanup media + PeerJS ===========
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
      setRemoteStream((prev) => {
        prev?.getTracks().forEach((t) => t.stop());
        return null;
      });
      if (peerRef.current) {
        peerRef.current.disconnect?.();
        peerRef.current.destroy();
        peerRef.current = null;
      }
      if (modelRef.current) { modelRef.current.dispose?.(); modelRef.current = null; }
      modelInitGuardRef.current = false;
    };
  }, [patientId]);

  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch(() => {});
    }
  }, [remoteStream]);

  const triggerCaptureFlash = () => {
    setCaptureFlash(true);
    window.setTimeout(() => setCaptureFlash(false), 450);
  };

  const commitCapturedImageRef = useRef<(img: string, stage: string) => void>(() => {});
  commitCapturedImageRef.current = (img: string, stage: string) => {
    if (stage === 'FRONT') {
      imagesRef.current.front = img;
      setCapturedImages((p: any) => ({ ...p, front: img }));
      captureStageRef.current = 'LEFT';
      setAiMessage('✅ Trực diện OK. Quay TRÁI!');
      playShutterSound();
      sendVoiceToPatient('Đã chụp trực diện, hãy quay mặt sang trái.');
    } else if (stage === 'LEFT') {
      imagesRef.current.left = img;
      setCapturedImages((p: any) => ({ ...p, left: img }));
      captureStageRef.current = 'RIGHT';
      setAiMessage('✅ Mặt trái OK. Quay PHẢI!');
      playShutterSound();
      sendVoiceToPatient('Đã chụp mặt trái, hãy quay mặt sang phải.');
    } else if (stage === 'RIGHT') {
      imagesRef.current.right = img;
      setCapturedImages((p: any) => ({ ...p, right: img }));
      captureStageRef.current = 'DONE';
      setAiMessage('🎉 ĐÃ ĐỦ ẢNH. Bấm SẴN SÀNG ĐO để bắt đầu.');
      playShutterSound();
    }
    lastCaptureTimeRef.current = Date.now();
    kpHistoryRef.current = [];
    triggerCaptureFlash();
  };

  const handleManualCapture = () => {
    const v = remoteVideoRef.current;
    if (!v || v.readyState < 3) {
      setAiMessage('Chưa có khung hình từ camera bệnh nhân.');
      return;
    }
    const img = snapVideoFrame(v);
    if (!img) {
      setAiMessage('Không chụp được frame. Đợi video load xong.');
      return;
    }
    const stage = captureStageRef.current;
    if (stage === 'IDLE' || stage === 'FRONT' || !imagesRef.current.front) {
      commitCapturedImageRef.current(img, 'FRONT');
      setAiMessage('📸 Manual: Trực diện OK.');
    } else if (stage === 'LEFT' || !imagesRef.current.left) {
      commitCapturedImageRef.current(img, 'LEFT');
      setAiMessage('📸 Manual: Mặt trái OK.');
    } else if (stage === 'RIGHT' || !imagesRef.current.right) {
      commitCapturedImageRef.current(img, 'RIGHT');
      setAiMessage('📸 Manual: Đủ 3 ảnh.');
    } else {
      setAiMessage('Đã đủ 3 ảnh.');
    }
  };

  // AI face detection
  useEffect(() => {
    if (!model || !remoteStream) return;

    faceDetectActiveRef.current = true;
    let rafId = 0;
    let lastInferAt = 0;
    let inferBusy = false;
    const INFER_INTERVAL_MS = 200;

    const tick = async (now: number) => {
      if (!faceDetectActiveRef.current) return;
      rafId = requestAnimationFrame(tick);
      if (inferBusy || now - lastInferAt < INFER_INTERVAL_MS) return;
      const v = remoteVideoRef.current;
      const stage = captureStageRef.current;
      if (!v || v.readyState < 3 || stage === 'DONE' || stage === 'IDLE') return;

      inferBusy = true;
      lastInferAt = now;
      try {
        const burst = burstCaptureRef.current;
        if (burst) {
          const elapsed = Date.now() - burst.startedAt;
          const score = measureFrameSharpness(v);
          const img = snapVideoFrame(v);
          if (img) burst.samples.push({ score, img });
          if (burst.samples.length >= BURST_MAX_SAMPLES || elapsed >= BURST_DURATION_MS) {
            if (burst.samples.length > 0) {
              const best = burst.samples.reduce((a, b) => (a.score >= b.score ? a : b));
              commitCapturedImageRef.current(best.img, burst.stage);
            } else {
              const fallback = snapVideoFrame(v);
              if (fallback) commitCapturedImageRef.current(fallback, burst.stage);
            }
            burstCaptureRef.current = null;
            setIsScanningSharpness(false);
          }
          return;
        }
        if (Date.now() - lastCaptureTimeRef.current < 1500) return;

        const faces = await model.estimateFaces(v, { flipHorizontal: false });
        if (faces.length === 0) { kpHistoryRef.current = []; return; }
        const kp = faces[0].keypoints;
        const kpSnap = extractKpSnapshot(kp);
        const hist = kpHistoryRef.current;
        hist.push(kpSnap);
        if (hist.length > STABILITY_FRAME_COUNT) hist.shift();
        const yaw = Math.abs(kp[1].x - kp[33].x) / (Math.abs(kp[1].x - kp[263].x) + 0.1);
        const mouthRatio = getMouthOpenRatio(kp);

        if (!matchesCapturePose(stage, yaw, mouthRatio)) return;
        if (!isHeadStable(hist)) {
          setAiMessage('Giữ yên đầu, há miệng vừa đủ...');
          return;
        }
        const firstScore = measureFrameSharpness(v);
        const firstImg = snapVideoFrame(v);
        burstCaptureRef.current = { stage, startedAt: Date.now(), samples: firstImg ? [{ score: firstScore, img: firstImg }] : [] };
        setIsScanningSharpness(true);
        setAiMessage('🔍 Đang quét độ nét (giữ yên)...');
      } finally { inferBusy = false; }
    };
    rafId = requestAnimationFrame(tick);
    return () => {
      faceDetectActiveRef.current = false;
      burstCaptureRef.current = null;
      kpHistoryRef.current = [];
      setIsScanningSharpness(false);
      cancelAnimationFrame(rafId);
    };
  }, [model, remoteStream]);

  // MQTT
  useEffect(() => {
    if (!activeDeviceId) return;
    const lockTopic = `joint_monitor/${activeDeviceId}/lock`;
    const statusTopic = `joint_monitor/${activeDeviceId}/status`;
    const dataTopic = `joint_monitor/${activeDeviceId}/data`;
    const client = mqtt.connect('wss://8b0913889a6742eb9501c5caf1b137eb.s1.eu.hivemq.cloud:8884/mqtt', { username: 'MiceBach', password: 'Kneejoint1@' });
    mqttClientRef.current = client;
    hasAttemptedLockRef.current = false;

    client.on('connect', () => { client.subscribe([lockTopic, statusTopic, dataTopic]); setIsMqttConnected(true); });
    client.on('message', (t, m) => {
      const msg = m.toString();
      if (t === lockTopic) {
        if (!hasAttemptedLockRef.current) {
          if (msg === "FREE" || msg === "" || msg === patientId) {
            client.publish(lockTopic, patientId, { retain: true });
            setIsDeviceLockedByMe(true); hasAttemptedLockRef.current = true;
          } else {
            alert(`❌ THIẾT BỊ ĐANG BẬN đo cho bệnh nhân: ${msg}`);
            setActiveDeviceId(""); client.end(); return;
          }
        }
      }
      if (t === dataTopic && hasAttemptedLockRef.current) {
        setIsDeviceOnline(true); lastSeenRef.current = Date.now();
        try {
          const payload = JSON.parse(msg);
          const p = { time: new Date().toLocaleTimeString('vi-VN', { hour12: false }), angle: payload.angle || 0, audio: payload.audio || 0, ai: payload.ai_status };
          if (payload.session === "active") {
            if (!isRecordingRef.current) { isRecordingRef.current = true; recordingDataRef.current = []; setIsRecording(true); }
            recordingDataRef.current.push(p);
          } else if (payload.session === "end" && isRecordingRef.current) {
            isRecordingRef.current = false; setIsRecording(false); handleFinalSaveRef.current(payload.ai_status);
          }
          setCurrentAiStatus(payload.ai_status);
          setData((prev) => {
            const next = [...prev, p];
            if (next.length > 100) next.splice(0, next.length - 100);
            return next;
          });
        } catch (e) {}
      }
    });
    return () => { 
      // =========== FIX: Force MQTT cleanup with end(true) ===========
      if (client.connected && hasAttemptedLockRef.current) {
        client.publish(lockTopic, "FREE", { retain: true });
      }
      client.end(true); // true = force close immediately
    };
  }, [activeDeviceId, patientId]);

  // =========== STEP A: START GUIDE ===========
  const handleStartGuide = () => {
    if (!mqttClientRef.current || !isDeviceLockedByMe) return;
    sendVoiceToPatient('Sẵn sàng chụp, hãy giữ đầu thẳng nhìn vào camera.');
    setAiMessage('📣 Đã gửi hướng dẫn chụp ảnh. Đợi bệnh nhân chuẩn bị...');
    captureStageRef.current = 'FRONT';
  };

  // =========== STEP B: START MEASURE with 20s auto-timer ===========
  const handleStartMeasure = () => {
    if (!mqttClientRef.current || !isDeviceLockedByMe) return;
    if (!imagesRef.current.front || !imagesRef.current.left || !imagesRef.current.right) {
      setAiMessage('Cần chụp đủ 3 ảnh trước khi đo!');
      return;
    }
    // Send voice guide
    sendVoiceToPatient('Hãy áp thiết bị vào vùng má và thực hiện đóng mở hàm liên tục.');
    setAiMessage('🔴 ĐANG ĐO - 20 giây tự động');
    setIsMeasuring(true);
    setMeasureTimer(MEASURE_DURATION_SEC);
    
    let remaining = MEASURE_DURATION_SEC;
    measureTimerRef.current = setInterval(() => {
      remaining--;
      setMeasureTimer(remaining);
      if (remaining <= 0) {
        if (measureTimerRef.current) clearInterval(measureTimerRef.current);
        setIsMeasuring(false);
        // Auto final save
        handleFinalSaveRef.current(currentAiStatus);
      }
    }, 1000);
  };

  // Camera request
  const handleRequestCam = () => {
    if (!mqttClientRef.current || !isDeviceLockedByMe) return;
    if (!isPeerReady) {
      setAiMessage('Đang khởi tạo kênh video, thử lại sau vài giây...');
      return;
    }
    const client = mqttClientRef.current;
    if (activeDeviceId) {
      client.publish(`joint_monitor/${activeDeviceId}/request_cam`, 'START_CAM');
    }
    client.publish(`joint_monitor/${patientId}/request_cam`, 'START_CAM');
    setAiMessage('Đã gửi lệnh mở cam tới thiết bị & bệnh nhân.');
  };

  // =========== STEP C: FINAL SAVE with voice ===========
  const handleFinalSaveRef = useRef<(sAi: number) => Promise<void>>(async () => {});
  handleFinalSaveRef.current = async (sAi: number) => {
    if (isSavingRef.current) return;
    isSavingRef.current = true;
    setIsSaving(true);
    
    sendVoiceToPatient('Quá trình đo đã hoàn tất. Bạn có thể bỏ thiết bị ra khỏi vùng mặt. Cảm ơn bạn.');
    
    try {
      const imageUrls = await uploadTmjSessionImages(patientId, {
        front: imagesRef.current.front,
        left: imagesRef.current.left,
        right: imagesRef.current.right,
      });

      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId,
          sensorData: recordingDataRef.current,
          aiStatus: sAi,
          duration: Math.round(recordingDataRef.current.length / 20),
          aiNormal: recordingDataRef.current.filter((d: any) => d.ai === 0).length,
          aiArthritis: recordingDataRef.current.filter((d: any) => d.ai === 1).length,
          aiDegeneration: recordingDataRef.current.filter((d: any) => d.ai === 2).length,
          aiSevere: recordingDataRef.current.filter((d: any) => d.ai === 3).length,
          imageFront: imageUrls.imageFront,
          imageLeft: imageUrls.imageLeft,
          imageRight: imageUrls.imageRight,
        }),
      });

      if (res.ok) {
        alert('✅ Đã đồng bộ hồ sơ TMJ!');
        window.location.href = `/doctor/patient/${patientId}/history`;
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err?.error ?? 'Lỗi lưu phiên đo.');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Lỗi upload ảnh hoặc mạng.';
      alert(msg);
    } finally {
      setIsSaving(false);
      isSavingRef.current = false;
    }
  };

  const handleFinalSave = (sAi: number) => handleFinalSaveRef.current(sAi);

  const statusUi = getTmjAiUI(currentAiStatus);
  const status = { text: statusUi.text, color: statusUi.badgeColor, icon: statusUi.icon };
  const allCaptured = capturedImages.front && capturedImages.left && capturedImages.right;

  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-screen max-w-7xl mx-auto font-sans pb-20">
        {isSaving && (
          <div className="fixed inset-0 bg-white/80 backdrop-blur-md z-[1000] flex flex-col items-center justify-center animate-in fade-in">
            <div className="bg-white p-10 rounded-[3rem] shadow-2xl flex flex-col items-center border border-slate-100">
              <Loader2 className="h-16 w-16 text-blue-600 animate-spin mb-6" />
              <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter text-center">Đang tải ảnh & lưu hồ sơ TMJ...</h2>
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-5 rounded-[2rem] shadow-sm mb-8 border border-slate-100">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.push('/doctor')} className="rounded-full shadow-sm"><ArrowLeft className="h-4 w-4" /></Button>
            <div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tighter uppercase italic">TMJ-Diagnosis: {patientId}</h1>
              <div className="flex items-center gap-3 mt-1">
                <span className={`h-2 w-2 rounded-full ${isDeviceOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{isDeviceOnline ? 'ONLINE' : 'OFFLINE'}</span>
                {isDeviceLockedByMe && <span className="flex items-center gap-1 text-[10px] font-black text-blue-600 uppercase"><ShieldCheck className="h-3 w-3"/> Đã khóa mạch</span>}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-2xl border border-slate-100 shadow-inner">
            <input type="text" placeholder="Mã thiết bị" className="px-4 py-2 text-xs rounded-xl border-none bg-transparent w-44 uppercase font-mono outline-none"
              value={inputDeviceId} onChange={(e) => setInputDeviceId(e.target.value.toUpperCase())} disabled={!!activeDeviceId} />
            {!activeDeviceId ? <Button onClick={() => setActiveDeviceId(inputDeviceId)} className="bg-emerald-600 rounded-xl px-6 font-black hover:bg-emerald-700 shadow-md">KẾT NỐI</Button> : <Button onClick={() => setActiveDeviceId("")} variant="destructive" className="rounded-xl font-black"><Unlock className="h-4 w-4 mr-1"/> NGẮT</Button>}
          </div>

          <div className="flex gap-2 flex-wrap">
             <Button variant="outline" onClick={() => router.push(`/doctor/patient/${patientId}/history`)} className="rounded-xl border-slate-200"><History className="mr-2 h-4 w-4" /> LỊCH SỬ</Button>
             <Button className={`rounded-xl px-4 font-black shadow-lg transition-all ${isDeviceLockedByMe && isPeerReady ? 'bg-blue-600' : 'bg-slate-300 opacity-50'}`}
                onClick={handleRequestCam}
                disabled={!isDeviceLockedByMe || !isPeerReady || !!remoteStream}><Video className="mr-2 h-4 w-4" /> MỞ CAM</Button>
          </div>
        </div>

        {/* =========== CONTROL PANEL =========== */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
          <Button onClick={handleStartGuide}
            disabled={!isDeviceLockedByMe || !remoteStream || captureStageRef.current === 'DONE'}
            className={`rounded-2xl py-8 font-black ${captureStageRef.current === 'FRONT' || captureStageRef.current === 'LEFT' || captureStageRef.current === 'RIGHT' ? 'bg-amber-500' : 'bg-emerald-600'} text-white shadow-lg`}>
            <Camera className="mr-2 h-5 w-5" /> 🅰️ SẴN SÀNG CHỤP
          </Button>

          <Button onClick={handleStartMeasure}
            disabled={!isDeviceLockedByMe || !allCaptured || isMeasuring}
            className={`rounded-2xl py-8 font-black shadow-lg ${isMeasuring ? 'bg-red-600 animate-pulse' : 'bg-violet-600'} text-white`}>
            <Mic className="mr-2 h-5 w-5" /> 🅱️ SẴN SÀNG ĐO
          </Button>

          <Button onClick={() => handleFinalSave(currentAiStatus)} 
            disabled={isSaving || data.length === 0} 
            className="bg-orange-500 text-white rounded-2xl py-8 font-black shadow-lg hover:bg-orange-600">
            <Save className="mr-2 h-5 w-5" /> LƯU HỒ SƠ
          </Button>

          {isMeasuring && (
            <div className="flex items-center justify-center bg-red-50 rounded-2xl border-2 border-red-200 animate-pulse">
              <div className="text-center">
                <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">TỰ ĐỘNG KẾT THÚC</p>
                <p className="text-4xl font-black text-red-700">{measureTimer}s</p>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* FIX: Recharts container needs min-height */}
            <Card className="shadow-sm border-none overflow-hidden rounded-[2rem]">
              <CardHeader className="bg-white border-b py-4 px-6 text-xs font-black text-blue-700 uppercase tracking-widest"><Zap className="h-4 w-4 inline mr-2"/>Biên độ há miệng</CardHeader>
              <CardContent className="p-6 bg-white">
                <div style={{ width: '100%', minHeight: 280 }}>
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={realtimeChartData}><CartesianGrid strokeDasharray="3 3" vertical={false}/><YAxis domain={[-10, 180]} width={40} /><Line isAnimationActive={false} type="monotone" dataKey="angle" stroke="#2563eb" strokeWidth={4} dot={false} /></LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm border-none overflow-hidden rounded-[2rem]">
              <CardHeader className="bg-white border-b py-4 px-6 text-xs font-black text-purple-700 uppercase tracking-widest"><Activity className="h-4 w-4 inline mr-2"/>Tín hiệu âm thanh TMJ</CardHeader>
              <CardContent className="p-6 bg-white">
                <div style={{ width: '100%', minHeight: 280 }}>
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={realtimeChartData}><CartesianGrid strokeDasharray="3 3" vertical={false}/><YAxis domain={['auto', 'auto']} width={40} /><Line isAnimationActive={false} type="monotone" dataKey="audio" stroke="#9333ea" strokeWidth={3} dot={false} /></LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
          <Card className="shadow-2xl border-none bg-white sticky top-8 rounded-[2.5rem] overflow-hidden p-6 flex flex-col items-center">
            <div
              className={`w-full bg-slate-950 rounded-[2.5rem] overflow-hidden relative aspect-[3/4] shadow-2xl flex items-center justify-center border-4 transition-all duration-300 ${
                captureFlash ? 'border-green-400 ring-4 ring-green-300/60' : 'border-slate-50'
              }`}
            >
               {remoteStream ? (
                 <>
                   <video ref={remoteVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                   {isScanningSharpness && (
                     <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none bg-black/20">
                       <div className="bg-white/90 rounded-full p-4 shadow-xl">
                         <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
                       </div>
                     </div>
                   )}
                   <Button
                     type="button"
                     onClick={handleManualCapture}
                     className="absolute top-4 right-4 z-10 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-black uppercase tracking-wider px-4 py-2 h-auto rounded-xl shadow-lg"
                   >
                     CHỤP ÉP
                   </Button>
                 </>
               ) : (
                 <div className="text-center p-8">
                   <Camera className="h-16 w-16 text-slate-800 mx-auto opacity-10 mb-4" />
                   <p className="text-slate-500 text-[10px] uppercase font-black tracking-widest leading-relaxed">Chưa nối Camera</p>
                 </div>
               )}
               <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-md px-6 py-2 rounded-full border border-white shadow-xl whitespace-nowrap max-w-[90%]">
                 <p className="font-black text-[10px] uppercase tracking-wider text-blue-600 truncate">{aiMessage}</p>
               </div>
            </div>
            <div className="flex w-full items-center justify-between mt-8 bg-slate-50 p-5 rounded-3xl border border-slate-100">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl ${status.color} flex items-center justify-center text-xl text-white shadow-lg`}>{status.icon}</div>
                <div><p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight opacity-60">Kết luận AI</p><h2 className="text-base font-black text-slate-800 tracking-tighter">{status.text}</h2></div>
              </div>
              <div className="flex gap-1.5">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center border-2 ${capturedImages.front ? 'bg-green-100 border-green-200 text-green-600' : 'bg-white border-slate-100 text-slate-200'}`}><CheckCircle2 className="w-4 h-4"/></div>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center border-2 ${capturedImages.left ? 'bg-green-100 border-green-200 text-green-600' : 'bg-white border-slate-100 text-slate-200'}`}><CheckCircle2 className="w-4 h-4"/></div>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center border-2 ${capturedImages.right ? 'bg-green-100 border-green-200 text-green-600' : 'bg-white border-slate-100 text-slate-200'}`}><CheckCircle2 className="w-4 h-4"/></div>
              </div>
            </div>
            {isMeasuring && (
               <div className="mt-6 w-full py-4 px-4 bg-red-50 rounded-2xl border-2 border-red-200 flex items-center justify-center gap-3 animate-pulse">
                 <div className="w-3 h-3 bg-red-600 rounded-full animate-ping" />
                 <p className="text-red-600 text-sm font-black uppercase tracking-widest">ĐANG ĐO {measureTimer}s</p>
               </div>
            )}
            {isRecording && !isMeasuring && (
               <div className="mt-6 w-full py-3 px-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-center justify-center gap-3">
                 <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                 <p className="text-blue-600 text-[10px] font-black uppercase tracking-widest">ĐANG GHI DATA TỪ ESP...</p>
               </div>
            )}
          </Card>
        </div>
    </div>
  )
}