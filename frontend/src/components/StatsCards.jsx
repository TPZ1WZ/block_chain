import { motion } from "framer-motion";
import { CircleCheck, CircleDot, Scale, Ticket } from "lucide-react";

const cards = [
  { key: "total", label: "Tổng ticket", icon: Ticket, tone: "text-blue-600" },
  { key: "open", label: "Đang mở", icon: CircleDot, tone: "text-sky-600" },
  { key: "active", label: "Đang làm", icon: CircleCheck, tone: "text-amber-600" },
  { key: "disputed", label: "Tranh chấp", icon: Scale, tone: "text-rose-600" },
];

export default function StatsCards({ stats }) {
  return (
    <motion.div
      className="grid grid-cols-2 gap-3"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.07 } },
      }}
      initial="hidden"
      animate="show"
    >
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <motion.div
            key={card.key}
            variants={{
              hidden: { opacity: 0, y: 16 },
              show: { opacity: 1, y: 0 },
            }}
            whileHover={{ y: -4, scale: 1.01 }}
            className="rounded-[20px] border border-[#E6EAF5] bg-white/82 p-3.5 shadow-[0_14px_36px_rgba(15,23,42,0.055)] backdrop-blur"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-slate-500">{card.label}</p>
              <Icon className={`h-4 w-4 ${card.tone}`} />
            </div>
            <p className="mt-2 text-2xl font-black tracking-tight text-[#071127]">
              {stats[card.key]}
            </p>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
