import { motion } from "framer-motion";
import { Blocks, CircleDollarSign, KeyRound, ShieldCheck } from "lucide-react";

const features = [
  { icon: ShieldCheck, title: "Ký quỹ an toàn", desc: "ETH được giữ bởi Smart Contract." },
  { icon: CircleDollarSign, title: "Thanh toán tự động", desc: "Giải ngân sau khi xác nhận." },
  { icon: Blocks, title: "Minh bạch on-chain", desc: "Ticket và trạng thái rõ ràng." },
  { icon: KeyRound, title: "Không trung gian", desc: "Tương tác trực tiếp qua ví." },
];

export default function FeatureCards() {
  return (
    <motion.div
      className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07 } } }}
      initial="hidden"
      animate="show"
    >
      {features.map((feature) => {
        const Icon = feature.icon;
        return (
          <motion.div
            key={feature.title}
            variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }}
            whileHover={{ y: -4, scale: 1.01 }}
            className="rounded-[24px] border border-[#E6EAF5] bg-white/76 p-4 shadow-[0_14px_42px_rgba(15,23,42,0.055)] backdrop-blur transition-colors hover:border-blue-200"
          >
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 text-white shadow-lg shadow-blue-500/20">
              <Icon className="h-5 w-5" />
            </div>
            <h3 className="mt-3 text-sm font-black text-[#071127]">
              {feature.title}
            </h3>
            <p className="mt-1 text-sm leading-6 text-slate-500">{feature.desc}</p>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
