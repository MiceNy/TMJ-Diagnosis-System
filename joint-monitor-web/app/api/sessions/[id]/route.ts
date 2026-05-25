import { NextResponse } from "next/server";
import prisma from "@/lib/prisma"; // Dùng prisma đã cấu hình Singleton cho bản 7

// API XÓA PHIÊN ĐO
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    
    await prisma.session.delete({
      where: { id: resolvedParams.id }
    });

    return NextResponse.json({ success: true, message: "Đã xóa phiên đo" });
  } catch (error) {
    console.error("Lỗi xóa phiên đo:", error);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}

// API SỬA (LƯU ĐÁNH GIÁ CỦA BÁC SĨ)
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const body = await req.json();
    const { doctorNotes } = body; // Lấy nội dung ghi chú gửi từ web lên

    // Cập nhật vào Database
    const updatedSession = await prisma.session.update({
      where: { id: resolvedParams.id },
      data: { doctorNotes: doctorNotes }
    });

    return NextResponse.json(updatedSession);
  } catch (error) {
    console.error("Lỗi lưu đánh giá:", error);
    return NextResponse.json({ error: "Lỗi khi lưu đánh giá vào cơ sở dữ liệu" }, { status: 500 });
  }
}