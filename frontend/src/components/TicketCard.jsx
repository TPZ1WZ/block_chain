import { Clock, Eye, HandCoins } from "lucide-react";
import { motion } from "framer-motion";
import { formatEth, formatUnixDate, shortAddress, ZERO_ADDRESS } from "../utils/format";
import { getStatusMeta } from "../utils/status";

const categoryLabels = [
  "Web design",
  "Smart contract",
  "Data analysis",
  "Content writing",
  "Translation",
];

export default function TicketCard({
  ticket,
  selected,
  currentAddress,
  currentTime,
  onSelect,
  onClaim,
}) {
  const status = getStatusMeta(ticket.status);
  const canClaim =
    ticket.status === 0 &&
    ticket.worker === ZERO_ADDRESS &&
    currentAddress &&
    currentAddress.toLowerCase() !== ticket.company.toLowerCase();

  return (
    <motion.article
      variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
      whileHover={{ y: -4, scale: 1.01 }}
      className={`group rounded-[24px] border bg-white/86 p-4 shadow-[0_14px_42px_rgba(15,23,42,0.055)] backdrop-blur transition-colors duration-200 ${
        selected ? "border-blue-300 ring-4 ring-blue-100" : "border-[#E6EAF5] hover:border-blue-200"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black ring-1 ${status.tone}`}
          >
            <span className={`h-2 w-2 rounded-full ${status.dot}`} />
            {status.label}
          </span>
          <span className="inline-flex items-center rounded-full bg-slate-50 px-3 py-1 text-xs font-black text-slate-500 ring-1 ring-slate-100">
            {categoryLabels[ticket.category] || "Khac"}
          </span>
        </div>
        <p className="text-right text-lg font-black text-emerald-600">
          {formatEth(ticket.amount)} ETH
        </p>
      </div>

      <h3 className="mt-3 line-clamp-2 min-h-11 text-base font-black leading-6 text-slate-950">
        {ticket.title}
      </h3>

      <div className="mt-4 space-y-2 text-xs font-semibold text-slate-500">
        <div className="flex items-center justify-between gap-3">
          <span>Người tạo</span>
          <span className="font-mono text-slate-700">
            {shortAddress(ticket.company)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span>Worker</span>
          <span className="font-mono text-slate-700">
            {ticket.worker === ZERO_ADDRESS
              ? "Chưa nhận"
              : shortAddress(ticket.worker)}
          </span>
        </div>
        {(() => {
          const diff = ticket.deadline - currentTime;
          const isExpired = diff < 0;
          const isUrgent = diff >= 0 && diff < 48 * 3600;
          return (
            <div className={`flex items-center gap-2 rounded-xl px-2 py-1.5 pt-1 ${isExpired ? "bg-red-50" : isUrgent ? "bg-orange-50" : ""}`}>
              <Clock className={`h-4 w-4 ${isExpired ? "text-red-500" : isUrgent ? "text-orange-500" : "text-blue-400"}`} />
              <span className={isExpired ? "font-black text-red-600" : isUrgent ? "font-black text-orange-600" : ""}>
                {isExpired ? "⚠ Hết hạn — " : isUrgent ? "⏰ Sắp hết — " : ""}
                {formatUnixDate(ticket.deadline)}
              </span>
            </div>
          );
        })()}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => onSelect(ticket)}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-xs font-black text-white transition hover:-translate-y-0.5 hover:bg-blue-700"
        >
          <Eye className="h-4 w-4" />
          Chi tiết
        </button>
        <button
          type="button"
          disabled={!canClaim}
          onClick={() => onClaim(ticket)}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs font-black text-blue-700 transition hover:-translate-y-0.5 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0"
        >
          <HandCoins className="h-4 w-4" />
          Nhận Ticket
        </button>
      </div>
    </motion.article>
  );
}
