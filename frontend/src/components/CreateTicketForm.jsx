import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CalendarDays, FileText, Loader2, LockKeyhole, Sparkles } from "lucide-react";

const defaultDeadline = () =>
  new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16);

export default function CreateTicketForm({ disabled, isBusy, onCreate }) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    detailsCID: "",
    amount: "0.1",
    deadlineLocal: defaultDeadline(),
  });
  const [error, setError] = useState("");

  const deadline = useMemo(() => {
    if (!form.deadlineLocal) return 0;
    return Math.floor(new Date(form.deadlineLocal).getTime() / 1000);
  }, [form.deadlineLocal]);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function submit(event) {
    event.preventDefault();
    setError("");

    if (!form.title.trim()) {
      setError("Tiêu đề công việc là bắt buộc.");
      return;
    }
    if (!form.amount || Number(form.amount) <= 0) {
      setError("Số tiền thưởng ETH phải lớn hơn 0.");
      return;
    }
    if (deadline <= Math.floor(Date.now() / 1000)) {
      setError("Thời hạn phải nằm trong tương lai.");
      return;
    }

    const reference =
      form.detailsCID.trim() ||
      `opentask://${encodeURIComponent(form.title.trim().toLowerCase())}`;

    onCreate({
      title: form.title.trim(),
      detailsCID: reference,
      amount: form.amount,
      deadline,
    });
  }

  return (
    <motion.section
      id="create-ticket"
      className="rounded-[32px] border border-[#E6EAF5] bg-white/82 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.07)] backdrop-blur-xl md:p-7"
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.42, ease: "easeOut" }}
    >
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">
            <Sparkles className="h-3.5 w-3.5" />
            Ticket ký quỹ
          </div>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950">
            Tạo Ticket mới
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Ký quỹ sẽ được giữ trong Smart Contract Escrow và chỉ được giải ngân
            khi hoàn thành & xác nhận.
          </p>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-bold text-slate-700">
              Tiêu đề công việc
            </span>
            <div className="flex min-h-12 items-center gap-3 rounded-2xl border border-[#E6EAF5] bg-white px-4 py-3 transition focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-100">
              <FileText className="h-5 w-5 text-blue-500" />
              <input
                value={form.title}
                onChange={(event) => update("title", event.target.value)}
                placeholder="Ví dụ: Thiết kế website landing page"
                className="w-full border-none bg-transparent text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400"
              />
            </div>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-bold text-slate-700">
              CID / Tham chiếu
            </span>
            <input
              value={form.detailsCID}
              onChange={(event) => update("detailsCID", event.target.value)}
              placeholder="ipfs://..."
              className="min-h-12 w-full rounded-2xl border border-[#E6EAF5] bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />
          </label>
        </div>

        <label className="space-y-2">
          <span className="text-sm font-bold text-slate-700">
            Mô tả chi tiết / Yêu cầu
          </span>
          <textarea
            value={form.description}
            onChange={(event) => update("description", event.target.value)}
            placeholder="Mô tả rõ yêu cầu công việc, tiêu chí nghiệm thu, deadline nội bộ..."
            rows={5}
            className="min-h-[120px] w-full resize-none rounded-2xl border border-[#E6EAF5] bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          />
        </label>

        <div className="grid gap-4 lg:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-bold text-slate-700">
              Số tiền thưởng ETH
            </span>
            <div className="flex min-h-12 items-center rounded-2xl border border-[#E6EAF5] bg-white px-4 py-3 transition focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-100">
              <input
                value={form.amount}
                onChange={(event) => update("amount", event.target.value)}
                className="w-full border-none bg-transparent text-sm font-bold text-slate-900 outline-none"
              />
              <span className="rounded-xl bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                ETH
              </span>
            </div>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-bold text-slate-700">Thời hạn UTC</span>
            <div className="flex min-h-12 items-center gap-3 rounded-2xl border border-[#E6EAF5] bg-white px-4 py-3 transition focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-100">
              <CalendarDays className="h-5 w-5 text-violet-500" />
              <input
                type="datetime-local"
                value={form.deadlineLocal}
                onChange={(event) => update("deadlineLocal", event.target.value)}
                className="w-full border-none bg-transparent text-sm font-bold text-slate-900 outline-none"
              />
            </div>
          </label>
        </div>

        <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">
          Thời gian on-chain UTC:{" "}
          {deadline
            ? new Date(deadline * 1000).toUTCString()
            : "Chọn thời hạn hợp lệ"}
        </div>

        {error && (
          <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {error}
          </div>
        )}

        <motion.button
          type="submit"
          disabled={disabled || isBusy}
          whileHover={disabled || isBusy ? undefined : { scale: 1.01 }}
          whileTap={disabled || isBusy ? undefined : { scale: 0.985 }}
          className="inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(100deg,#2563EB,#7C3AED,#2563EB)] bg-[length:200%_100%] px-6 text-sm font-black text-white shadow-lg shadow-blue-500/25 transition duration-300 hover:bg-right hover:shadow-xl hover:shadow-violet-500/25 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isBusy ? <Loader2 className="h-5 w-5 animate-spin" /> : <LockKeyhole className="h-5 w-5" />}
          {isBusy ? "Đang xử lý giao dịch..." : "Tạo Ticket & Khóa ETH"}
        </motion.button>
      </form>
    </motion.section>
  );
}
