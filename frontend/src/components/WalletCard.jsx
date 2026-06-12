import { motion } from "framer-motion";
import { Copy, ExternalLink, Wallet } from "lucide-react";
import { shortAddress } from "../utils/format";

export default function WalletCard({
  address,
  balance,
  networkName,
  isConnected,
  onConnect,
}) {
  return (
    <motion.section
      className="rounded-[28px] border border-[#E6EAF5] bg-white/78 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.07)] backdrop-blur-xl"
      initial={{ opacity: 0, x: 18 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.42, ease: "easeOut" }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-500">
            Ví
          </p>
          <h3 className="mt-1 text-lg font-black text-[#071127]">Ví của tôi</h3>
        </div>
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 text-white shadow-lg shadow-blue-500/20">
          <Wallet className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-5 rounded-[24px] bg-gradient-to-br from-slate-950 to-slate-900 p-5 text-white shadow-xl shadow-slate-950/15">
        <p className="text-xs font-semibold text-slate-400">Số dư</p>
        <p className="mt-1 text-3xl font-black tracking-tight">{balance}</p>
        <p className="text-sm font-semibold text-blue-300">ETH</p>
      </div>

      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#E6EAF5] bg-white/78 px-4 py-3">
          <span className="text-sm font-semibold text-slate-500">Địa chỉ ví</span>
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-sm font-black text-slate-800">
              {shortAddress(address)}
            </span>
            <Copy className="h-4 w-4 shrink-0 text-slate-400" />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#E6EAF5] bg-white/78 px-4 py-3">
          <span className="text-sm font-semibold text-slate-500">Mạng</span>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
            {networkName}
          </span>
        </div>
      </div>

      {!isConnected && (
        <motion.button
          type="button"
          onClick={onConnect}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 text-sm font-black text-white shadow-lg shadow-blue-500/25"
        >
          <ExternalLink className="h-4 w-4" />
          Kết nối ví
        </motion.button>
      )}
    </motion.section>
  );
}
