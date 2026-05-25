import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

function parseSensorData(raw: unknown): string {
  if (typeof raw === "string") return raw;
  return JSON.stringify(raw ?? []);
}

function optionalImageUrl(value: unknown): string | null {
  if (value == null || value === "") return null;
  const s = String(value);
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  return null;
}

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") ?? "";

    let patientId: string;
    let sensorData: string;
    let duration: number;
    let aiStatus: number;
    let aiNormal: number;
    let aiArthritis: number;
    let aiDegeneration: number;
    let aiSevere: number;
    let imageFront: string | null = null;
    let imageLeft: string | null = null;
    let imageRight: string | null = null;

    if (contentType.includes("application/json")) {
      const body = await req.json();
      patientId = body.patientId;
      sensorData = parseSensorData(body.sensorData);
      duration = parseInt(String(body.duration ?? "0"), 10);
      aiStatus = parseInt(String(body.aiStatus ?? "0"), 10);
      aiNormal = parseInt(String(body.aiNormal ?? "0"), 10);
      aiArthritis = parseInt(String(body.aiArthritis ?? "0"), 10);
      aiDegeneration = parseInt(String(body.aiDegeneration ?? "0"), 10);
      aiSevere = parseInt(String(body.aiSevere ?? "0"), 10);
      imageFront = optionalImageUrl(body.imageFront);
      imageLeft = optionalImageUrl(body.imageLeft);
      imageRight = optionalImageUrl(body.imageRight);
    } else {
      const formData = await req.formData();
      patientId = formData.get("patientId") as string;
      sensorData = (formData.get("sensorData") as string) ?? "[]";
      duration = parseInt((formData.get("duration") as string) || "0", 10);
      aiStatus = parseInt((formData.get("aiStatus") as string) || "0", 10);
      aiNormal = parseInt((formData.get("aiNormal") as string) || "0", 10);
      aiArthritis = parseInt((formData.get("aiArthritis") as string) || "0", 10);
      aiDegeneration = parseInt((formData.get("aiDegeneration") as string) || "0", 10);
      aiSevere = parseInt((formData.get("aiSevere") as string) || "0", 10);
      imageFront = optionalImageUrl(formData.get("imageFront"));
      imageLeft = optionalImageUrl(formData.get("imageLeft"));
      imageRight = optionalImageUrl(formData.get("imageRight"));
    }

    if (!patientId) {
      return NextResponse.json({ error: "Thiếu patientId" }, { status: 400 });
    }

    const newSession = await prisma.session.create({
      data: {
        patientId,
        sensorData,
        duration,
        aiStatus,
        aiNormal,
        aiArthritis,
        aiDegeneration,
        aiSevere,
        imageFront,
        imageLeft,
        imageRight,
      },
    });

    return NextResponse.json(newSession);
  } catch (error) {
    console.error("Lỗi API TMJ:", error);
    return NextResponse.json({ error: "Lỗi lưu dữ liệu" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get("patientId");
    const sessions = await prisma.session.findMany({
      where: patientId ? { patientId } : {},
      orderBy: { startTime: "desc" },
    });
    return NextResponse.json(sessions);
  } catch (error) {
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
