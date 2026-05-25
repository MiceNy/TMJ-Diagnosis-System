import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hệ thống Monitor Khớp hàm",
  description: "Phần mềm theo dõi và chẩn đoán dữ liệu y khoa",
};

// ĐOẠN NÀY LÀ BẮT BUỘC ĐỂ ĐIỆN THOẠI KHÔNG BỊ LỆCH GIAO DIỆN
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      {/* THÊM suppressHydrationWarning VÀO ĐÂY ĐỂ TRỊ EXTENSION BÊN THỨ 3 */}
      <body className="antialiased bg-slate-50" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}