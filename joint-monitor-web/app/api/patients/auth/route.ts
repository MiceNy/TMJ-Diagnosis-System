import { NextResponse } from "next/server";
import prisma from "@/lib/prisma"; // Dùng prisma đã cấu hình Singleton cho bản 7

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { patientId, accessCode } = body;

    // Tìm trong Database xem có bệnh nhân nào khớp cả ID và Mã truy cập không
    const patient = await prisma.patient.findFirst({
      where: { 
        id: patientId, 
        accessCode: accessCode 
      }
    });

    if (patient) {
      return NextResponse.json({ success: true, patientId: patient.id });
    } else {
      return NextResponse.json({ success: false, error: "Sai mã bệnh nhân hoặc mã truy cập!" }, { status: 401 });
    }
  } catch (error) {
    console.error("Lỗi xác thực:", error);
    return NextResponse.json({ error: "Lỗi Server" }, { status: 500 });
  }
}