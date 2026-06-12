import { motion } from "framer-motion";
import FeatureCards from "./FeatureCards";
import FlowSteps from "./FlowSteps";
import StatsCards from "./StatsCards";

export default function HeroSection({ stats }) {
  return (
    <section className="space-y-5">
      <div className="relative overflow-hidden rounded-[30px] border border-[#E6EAF5] bg-white/76 p-5 shadow-[0_20px_72px_rgba(15,23,42,0.075)] backdrop-blur-xl md:p-7">
        <div className="absolute inset-x-0 top-0 h-32 bg-[linear-gradient(120deg,rgba(37,99,235,0.12),rgba(124,58,237,0.10),transparent)]" />
        <div className="relative grid gap-6 xl:grid-cols-[1.18fr_0.82fr] xl:items-center">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.48, ease: "easeOut" }}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50/90 px-3 py-1.5 text-xs font-black text-blue-700">
              <span className="h-2 w-2 rounded-full bg-blue-600" />
              Phi tập trung • Minh bạch • Không cần trung gian
            </div>
            <h2 className="mt-4 max-w-3xl text-4xl font-black leading-[1.08] tracking-tight text-[#071127] lg:text-[44px]">
              OpenTask cho giao nhận công việc phi tập trung bằng{" "}
              <span className="bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
                Smart Contract Escrow
              </span>
            </h2>
            <p className="mt-4 max-w-2xl text-[15px] leading-7 text-slate-500">
              Tạo ticket, khóa ETH, nhận việc, nộp minh chứng và giải ngân
              bằng logic on-chain minh bạch, không cần trung gian.
            </p>
          </motion.div>

          <StatsCards stats={stats} />
        </div>
      </div>

      <FeatureCards />
      <FlowSteps />
    </section>
  );
}
