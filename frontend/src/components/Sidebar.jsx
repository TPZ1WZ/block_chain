import { motion } from "framer-motion";
import {
  BookOpen,
  BriefcaseBusiness,
  Clock3,
  LayoutDashboard,
  PlusCircle,
  Settings,
  ShieldCheck,
  Ticket,
  Wallet,
} from "lucide-react";
import { shortAddress } from "../utils/format";

const menu = [
  { id: "overview", label: "Tổng quan", icon: LayoutDashboard },
  { id: "create", label: "Tạo Ticket", icon: PlusCircle },
  { id: "board", label: "Bảng Ticket", icon: Ticket },
  { id: "myTickets", label: "Ticket của tôi", icon: BriefcaseBusiness },
  { id: "wallet", label: "Ví của tôi", icon: Wallet },
  { id: "history", label: "Lịch sử", icon: Clock3 },
  { id: "guide", label: "Hướng dẫn", icon: BookOpen },
  { id: "settings", label: "Cài đặt", icon: Settings },
];

const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.045 } },
};

const itemVariants = {
  hidden: { opacity: 0, x: -10 },
  show: { opacity: 1, x: 0 },
};

export default function Sidebar({
  address,
  balance,
  isConnected,
  activePage,
  onPageChange,
  onConnect,
}) {
  return (
    <aside className="sticky top-0 hidden h-screen p-4 lg:block">
      <div className="flex h-full flex-col rounded-[26px] border border-[#E6EAF5] bg-white/78 p-3.5 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 text-white shadow-lg shadow-blue-500/20">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight">
              Open<span className="text-blue-600">Task</span>
            </h1>
            <p className="text-[11px] font-semibold text-slate-400">
              Ký quỹ Web3
            </p>
          </div>
        </div>

        <motion.nav
          className="mt-8 space-y-1.5"
          variants={listVariants}
          initial="hidden"
          animate="show"
        >
          {menu.map((item) => {
            const Icon = item.icon;
            const active = activePage === item.id;
            return (
              <motion.button
                key={item.id}
                type="button"
                variants={itemVariants}
                onClick={() => onPageChange(item.id)}
                whileHover={{ x: 2 }}
                className={`relative flex w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-left text-sm font-semibold transition ${
                  active
                    ? "text-white"
                    : "text-slate-500 hover:bg-white hover:text-slate-950 hover:shadow-sm"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="sidebar-active"
                    className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-600/95 to-violet-600/95 shadow-lg shadow-blue-500/20"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <span className="relative flex items-center gap-3">
                <Icon className="h-[18px] w-[18px]" />
                <span>{item.label}</span>
                </span>
              </motion.button>
            );
          })}
        </motion.nav>

        <div className="mt-auto rounded-3xl border border-[#E6EAF5] bg-gradient-to-br from-slate-950 to-slate-900 p-4 text-white shadow-xl shadow-slate-950/15">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-2xl bg-white/10">
              <Wallet className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-slate-400">Ví của tôi</p>
              <p className="truncate text-sm font-bold">{shortAddress(address)}</p>
            </div>
          </div>
          <div className="mt-4 flex items-end justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-400">Số dư</p>
              <p className="text-lg font-black">{balance} ETH</p>
            </div>
            {!isConnected && (
              <button
                type="button"
                onClick={onConnect}
                className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-950 transition hover:scale-[1.02]"
              >
                Kết nối
              </button>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
