/** UI cho 4 mức ai_status từ ESP32 TMJ (0–3). */
export function getTmjAiUI(status: number) {
  if (status === 0) {
    return {
      text: "Bình thường",
      short: "Bình thường",
      bg: "bg-green-50",
      border: "border-green-200",
      textCol: "text-green-800",
      badgeColor: "bg-green-500",
      icon: "✅",
    };
  }
  if (status === 1) {
    return {
      text: "Tiếng Click / Lục cục",
      short: "Tiếng Click",
      bg: "bg-yellow-50",
      border: "border-yellow-200",
      textCol: "text-yellow-800",
      badgeColor: "bg-yellow-500",
      icon: "⚠️",
    };
  }
  if (status === 2) {
    return {
      text: "Tiếng lạo xạo (Crepitus)",
      short: "Tiếng lạo xạo",
      bg: "bg-orange-50",
      border: "border-orange-200",
      textCol: "text-orange-800",
      badgeColor: "bg-orange-500",
      icon: "🚨",
    };
  }
  if (status === 3) {
    return {
      text: "Thoái hóa nặng / Tiếng rắc",
      short: "Thoái hóa nặng",
      bg: "bg-red-50",
      border: "border-red-200",
      textCol: "text-red-900",
      badgeColor: "bg-red-600",
      icon: "❌",
    };
  }
  return {
    text: "Không xác định",
    short: "N/A",
    bg: "bg-slate-50",
    border: "border-slate-200",
    textCol: "text-slate-600",
    badgeColor: "bg-slate-400",
    icon: "?",
  };
}

/** Mức nghiêm trọng nhất từ số lần đếm trong phiên đo. */
export function getTmjOverallStatusFromCounts(session: {
  aiSevere?: number;
  aiDegeneration?: number;
  aiArthritis?: number;
  aiNormal?: number;
}): number {
  if ((session.aiSevere ?? 0) > 0) return 3;
  if ((session.aiDegeneration ?? 0) > 0) return 2;
  if ((session.aiArthritis ?? 0) > 0) return 1;
  return 0;
}
