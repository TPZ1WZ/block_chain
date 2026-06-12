import { motion } from "framer-motion";
import { BadgeCheck, CircleDollarSign, LockKeyhole, Users } from "lucide-react";

const steps = [
  { icon: LockKeyhole, label: "Tạo Ticket & Ký quỹ ETH" },
  { icon: Users, label: "Nhận việc & Thực hiện" },
  { icon: BadgeCheck, label: "Nộp proof & Xác nhận" },
  { icon: CircleDollarSign, label: "Giải ngân bằng Smart Contract" },
];

export default function FlowSteps() {
  return (
    <motion.div
      className="relative grid gap-4 rounded-[26px] border border-[#E6EAF5] bg-white/72 p-4 shadow-[0_16px_46px_rgba(15,23,42,0.055)] backdrop-blur md:grid-cols-4"
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.09 } } }}
      initial="hidden"
      animate="show"
    >
      <div className="absolute left-[12%] right-[12%] top-[36px] hidden h-px bg-gradient-to-r from-blue-500/20 via-violet-500/45 to-blue-500/20 md:block" />
      {steps.map((step, index) => {
        const Icon = step.icon;
        return (
          <motion.div
            key={step.label}
            variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
            className="relative flex items-center gap-3 md:flex-col md:text-center"
          >
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white bg-gradient-to-br from-blue-600 to-violet-600 text-white shadow-lg shadow-blue-500/20">
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-blue-500">
                Bước {index + 1}
              </p>
              <p className="mt-1 text-sm font-black leading-5 text-slate-800">
                {step.label}
              </p>
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
