export const STATUS_META = [
  {
    label: "Đang mở",
    tone: "bg-blue-50 text-blue-700 ring-blue-200",
    dot: "bg-blue-500",
  },
  {
    label: "Đang làm",
    tone: "bg-amber-50 text-amber-700 ring-amber-200",
    dot: "bg-amber-500",
  },
  {
    label: "Đã nộp",
    tone: "bg-amber-50 text-amber-700 ring-amber-200",
    dot: "bg-amber-500",
  },
  {
    label: "Tranh chấp",
    tone: "bg-rose-50 text-rose-700 ring-rose-200",
    dot: "bg-rose-500",
  },
  {
    label: "Đã thanh toán",
    tone: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    dot: "bg-emerald-500",
  },
  {
    label: "Đã hoàn tiền",
    tone: "bg-slate-100 text-slate-600 ring-slate-200",
    dot: "bg-slate-400",
  },
  {
    label: "Đã hủy",
    tone: "bg-slate-100 text-slate-600 ring-slate-200",
    dot: "bg-slate-400",
  },
];

export function getStatusMeta(status) {
  return STATUS_META[Number(status)] || STATUS_META[0];
}
