import { motion } from "framer-motion";
import { PlusCircle, SlidersHorizontal, Ticket } from "lucide-react";
import TicketCard from "./TicketCard";

const tabs = [
  { id: "all", label: "Tất cả" },
  { id: "open", label: "Đang mở" },
  { id: "active", label: "Đang làm" },
  { id: "submitted", label: "Đã nộp" },
  { id: "paid", label: "Hoàn thành" },
  { id: "disputed", label: "Tranh chấp" },
];

function filterTickets(tickets, activeTab, address) {
  if (activeTab === "open") return tickets.filter((ticket) => ticket.status === 0);
  if (activeTab === "active") {
    return tickets.filter((ticket) => ticket.status === 1);
  }
  if (activeTab === "submitted") return tickets.filter((ticket) => ticket.status === 2);
  if (activeTab === "paid") return tickets.filter((ticket) => ticket.status === 4);
  if (activeTab === "disputed") {
    return tickets.filter((ticket) => ticket.status === 3);
  }
  if (activeTab === "mine" && address) {
    const current = address.toLowerCase();
    return tickets.filter(
      (ticket) =>
        ticket.company.toLowerCase() === current ||
        ticket.worker.toLowerCase() === current
    );
  }
  return tickets;
}

export default function TicketBoard({
  tickets,
  activeTab,
  onTabChange,
  onSelect,
  selectedTicket,
  address,
  loading,
  onTicketAction,
  showTabs = true,
  title = "Danh sách ticket",
  onCreateTicket,
}) {
  const filtered = filterTickets(tickets, activeTab, address);

  return (
    <motion.section
      className="rounded-[32px] border border-[#E6EAF5] bg-white/82 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.07)] backdrop-blur-xl md:p-7"
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.42, ease: "easeOut" }}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
            <Ticket className="h-3.5 w-3.5" />
            Bảng Ticket
          </div>
          <h2 className="mt-3 text-2xl font-black text-slate-950">{title}</h2>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 shadow-sm"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Mới nhất
        </button>
      </div>

      {showTabs && (
      <div className="mt-6 flex gap-2 overflow-x-auto rounded-2xl border border-[#E6EAF5] bg-slate-50/90 p-1.5">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-black transition ${
              activeTab === tab.id
                ? "bg-white text-blue-700 shadow-sm"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      )}

      {loading ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-64 animate-pulse rounded-[26px] border border-[#E6EAF5] bg-gradient-to-br from-white to-slate-100"
            />
          ))}
        </div>
      ) : filtered.length ? (
        <motion.div
          className="mt-6 grid gap-5 md:grid-cols-2"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
          initial="hidden"
          animate="show"
        >
          {filtered.map((ticket) => (
            <TicketCard
              key={ticket.address}
              ticket={ticket}
              currentAddress={address}
              selected={
                selectedTicket?.address?.toLowerCase() === ticket.address.toLowerCase()
              }
              onSelect={onSelect}
              onClaim={(item) =>
                onTicketAction(item, { type: "claim", label: "Nhận Ticket" })
              }
            />
          ))}
        </motion.div>
      ) : (
        <div className="mt-6 rounded-3xl border border-dashed border-[#E6EAF5] bg-slate-50/80 p-12 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50">
            <Ticket className="h-7 w-7 text-blue-400" />
          </div>
          <p className="text-base font-black text-slate-700">Chưa có ticket nào</p>
          <p className="mt-1 text-sm text-slate-400">
            {activeTab === "all"
              ? "Chưa có ticket nào trên hệ thống."
              : "Không có ticket phù hợp với bộ lọc này."}
          </p>
          {onCreateTicket && activeTab === "all" && (
            <button
              type="button"
              onClick={onCreateTicket}
              className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-blue-700"
            >
              <PlusCircle className="h-4 w-4" />
              Tạo ticket đầu tiên
            </button>
          )}
        </div>
      )}
    </motion.section>
  );
}
