import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, ChevronDown, Menu, Network, Wallet, X } from "lucide-react";
import { shortAddress } from "../utils/format";

export default function Header({
  address,
  networkName,
  isConnected,
  walletError,
  onConnect,
  notifications = [],
}) {
  const [showNotifs, setShowNotifs] = useState(false);
  const [dismissed, setDismissed] = useState([]);

  const visible = notifications.filter((n) => !dismissed.includes(n.id));

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

        {/* Bell with dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowNotifs((v) => !v)}
            className="relative grid h-11 w-11 place-items-center rounded-2xl border border-[#E6EAF5] bg-white/80 text-slate-500 shadow-sm transition hover:-translate-y-0.5 hover:text-blue-600 hover:shadow-md"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            {visible.length > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white shadow">
                {visible.length}
              </span>
            )}
          </button>

          <AnimatePresence>
            {showNotifs && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={{ duration: 0.18 }}
                className="absolute right-0 top-14 z-50 w-80 rounded-2xl border border-[#E6EAF5] bg-white shadow-[0_24px_60px_rgba(15,23,42,0.14)]"
              >
                <div className="flex items-center justify-between border-b border-[#E6EAF5] px-4 py-3">
                  <p className="font-black text-slate-900">Thông báo</p>
                  <button onClick={() => setShowNotifs(false)}>
                    <X className="h-4 w-4 text-slate-400 hover:text-slate-700" />
                  </button>
                </div>
                {visible.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-slate-400">
                    Không có thông báo mới
                  </div>
                ) : (
                  <ul className="max-h-72 divide-y divide-[#F1F4FB] overflow-y-auto">
                    {visible.map((n) => (
                      <li key={n.id} className="flex items-start gap-3 px-4 py-3">
                        <span className="mt-0.5 text-lg">{n.icon}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-slate-800">{n.title}</p>
                          <p className="text-xs text-slate-500">{n.body}</p>
                        </div>
                        <button
                          onClick={() => setDismissed((d) => [...d, n.id])}
                          className="shrink-0 text-slate-300 hover:text-slate-500"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

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
