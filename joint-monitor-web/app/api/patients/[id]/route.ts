import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/auth-options";
import prisma from "@/lib/prisma"; // Dùng prisma đã cấu hình Singleton cho bản 7


export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Mở gói params trong Next.js 15
  const resolvedParams = await params;
  const patientId = resolvedParams.id;

  try {
    // 1. Xóa toàn bộ lịch sử đo của bệnh nhân này trước (tránh lỗi khóa ngoại)
    await prisma.session.deleteMany({
      where: { patientId: patientId }
    });

    // 2. Xóa hồ sơ bệnh nhân
    await prisma.patient.delete({
      where: { id: patientId }
    });

    return NextResponse.json({ success: true, message: "Đã xóa thành công" });
  } catch (error) {
    console.error("Lỗi xóa bệnh nhân:", error);
    return NextResponse.json({ error: "Lỗi khi xóa bệnh nhân" }, { status: 500 });
  }
}