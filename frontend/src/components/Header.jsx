import { motion } from "framer-motion";
import { Bell, ChevronDown, Menu, Network, Wallet } from "lucide-react";
import { shortAddress } from "../utils/format";

export default function Header({
  address,
  networkName,
  isConnected,
  walletError,
  onConnect,
}) {
  return (
    <motion.header
      className="sticky top-4 z-30 flex min-h-[68px] items-center justify-between gap-4 rounded-[24px] border border-[#E6EAF5]/90 bg-white/82 px-4 py-3 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:px-5"
      initial={{ opacity: 0, y: -14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, ease: "easeOut" }}
    >
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          className="grid h-10 w-10 place-items-center rounded-2xl border border-[#E6EAF5] bg-white text-slate-600 lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <p className="truncate text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
            OpenTask
          </p>
          <p className="truncate text-sm font-semibold text-slate-500">
            Bảng điều khiển ký quỹ Web3
          </p>
          {walletError && <p className="mt-0.5 text-xs text-rose-600">{walletError}</p>}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <button
          type="button"
          className="hidden items-center gap-2 rounded-2xl border border-[#E6EAF5] bg-white/80 px-3.5 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:inline-flex"
        >
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.14)]" />
          <Network className="h-4 w-4 text-blue-600" />
          {networkName}
          <ChevronDown className="h-4 w-4 text-slate-400" />
        </button>

        <button
          type="button"
          className="grid h-11 w-11 place-items-center rounded-2xl border border-[#E6EAF5] bg-white/80 text-slate-500 shadow-sm transition hover:-translate-y-0.5 hover:text-blue-600 hover:shadow-md"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
        </button>

        {isConnected ? (
          <div className="flex items-center gap-2 rounded-2xl border border-[#E6EAF5] bg-white/90 px-3 py-2 shadow-sm">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-500 shadow-md shadow-blue-500/20" />
            <span className="hidden text-sm font-black text-slate-800 sm:inline">
              {shortAddress(address)}
            </span>
          </div>
        ) : (
          <motion.button
            type="button"
            onClick={onConnect}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/25 transition hover:shadow-xl hover:shadow-violet-500/25"
          >
            <Wallet className="h-4 w-4" />
            Kết nối ví
          </motion.button>
        )}
      </div>
    </motion.header>
  );
}
