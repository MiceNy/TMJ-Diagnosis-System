import { NextResponse } from "next/server";

import { getServerSession } from "next-auth/next";
// Import cấu hình đăng nhập để lấy thông tin phiên làm việc
import { authOptions } from "@/app/api/auth/[...nextauth]/auth-options"; 

import prisma from "@/lib/prisma"; // Dùng prisma đã cấu hình Singleton cho bản 7

export async function GET(req: Request) {
  try {
    // 1. Kiểm tra xem bác sĩ nào đang gọi API
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const currentDoctorId = (session.user as any).id;

    // 2. CHỈ lấy danh sách bệnh nhân thuộc về bác sĩ này
    const patients = await prisma.patient.findMany({
      where: { doctorId: currentDoctorId }
    });
    
    return NextResponse.json(patients);
  } catch (error) {
    console.error("Lỗi API GET Bệnh nhân:", error);
    return NextResponse.json({ error: "Lỗi lấy danh sách" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    // 1. Kiểm tra bác sĩ đang tạo hồ sơ là ai
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const currentDoctorId = (session.user as any).id;
    const body = await req.json();
    
    // Tự động sinh mã truy cập 6 số
    const randomAccessCode = Math.floor(100000 + Math.random() * 900000).toString();

    // 2. Tạo bệnh nhân mới VÀ gắn luôn ID của bác sĩ vào hồ sơ
    const newPatient = await prisma.patient.create({
      data: {
        id: body.id,
        name: body.name,
        age: parseInt(body.age),
        gender: body.gender,
        accessCode: randomAccessCode,
        doctorId: currentDoctorId // <-- MẤU CHỐT LÀ Ở ĐÂY!
      }
    });

    return NextResponse.json(newPatient);
  } catch (error) {
    console.error("Lỗi API POST Bệnh nhân:", error);
    return NextResponse.json({ error: "Lỗi tạo bệnh nhân" }, { status: 500 });
  }
}