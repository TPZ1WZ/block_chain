import { createElement, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  BadgeCheck,
  Ban,
  CheckCircle2,
  ExternalLink,
  FileCheck2,
  GitPullRequestDraft,
  Scale,
  Send,
  Ticket,
  UserRound,
} from "lucide-react";
import { formatEth, formatUnixDate, shortAddress, ZERO_ADDRESS } from "../utils/format";
import { getStatusMeta } from "../utils/status";
import { ipfsToGatewayUrl, uploadFileToIPFS } from "../lib/ipfs";

const categoryLabels = [
  "Web design",
  "Smart contract",
  "Data analysis",
  "Content writing",
  "Translation",
];

export default function TicketDetailPanel({
  ticket,
  address,
  arbiters,
  currentTime,
  hasCurrentArbiterVoted,
  voteSummary,
  requiredVotes,
  selectedDisputeArbiters = [],
  disabled,
  onAction,
}) {
  const [proofCID, setProofCID] = useState("");
  const [proofNote, setProofNote] = useState("");
  const [proofFile, setProofFile] = useState(null);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [reason, setReason] = useState("");

  const role = useMemo(() => {
    if (!ticket || !address) return { isCompany: false, isWorker: false, isArbiter: false };
    const current = address.toLowerCase();
    return {
      isCompany: ticket.company.toLowerCase() === current,
      isWorker: ticket.worker.toLowerCase() === current,
      isArbiter:
        selectedDisputeArbiters.length > 0
          ? selectedDisputeArbiters.some((item) => item.toLowerCase() === current)
          : arbiters.some((item) => item.toLowerCase() === current),
    };
  }, [address, arbiters, selectedDisputeArbiters, ticket]);

  if (!ticket) {
    return (
      <motion.section
        className="sticky top-[116px] rounded-[28px] border border-dashed border-[#E6EAF5] bg-white/72 p-8 text-center shadow-[0_18px_60px_rgba(15,23,42,0.06)] backdrop-blur-xl"
        initial={{ opacity: 0, x: 18 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ type: "spring", stiffness: 180, damping: 22 }}
      >
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-blue-50 text-blue-600">
          <Ticket className="h-7 w-7" />
        </div>
        <h3 className="mt-4 text-xl font-black text-slate-950">Chi tiết Ticket</h3>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Chọn một ticket trên bảng để xem chi tiết, nhận việc, nộp minh chứng hoặc xử
          lý thanh toán.
        </p>
      </motion.section>
    );
  }

  const status = getStatusMeta(ticket.status);
  const isOpen = ticket.status === 0 && ticket.worker === ZERO_ADDRESS;
  const isClaimed = ticket.status === 1;
  const isSubmitted = ticket.status === 2;
  const isDisputed = ticket.status === 3;
  const canWorkerDispute = isSubmitted && ticket.deadline < currentTime;
  const detailsUrl = ipfsToGatewayUrl(ticket.detailsCID);
  const proofUrl = ipfsToGatewayUrl(ticket.proofCID);

  async function submitProof() {
    if (!proofCID.trim() && !proofFile) return;
    let uploaded = null;
    try {
      setUploadingProof(true);
      uploaded = proofFile
        ? await uploadFileToIPFS(proofFile, `proof-${ticket.address}`)
        : null;
    } finally {
      setUploadingProof(false);
    }
    const nextProofCID = uploaded?.uri || proofCID.trim();
    onAction(
      ticket,
      { type: "submit-proof", label: "Nộp minh chứng" },
      { proofCID: nextProofCID, proofNote: proofNote.trim() }
    );
  }

  function requestResubmission() {
    if (!reason.trim()) return;
    onAction(
      ticket,
      { type: "resubmit", label: "Yêu cầu nộp lại" },
      { reason: reason.trim() }
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.section
        key={ticket.address}
        className="sticky top-[116px] rounded-[28px] border border-[#E6EAF5] bg-white/80 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.07)] backdrop-blur-xl"
        initial={{ opacity: 0, x: 22, scale: 0.98 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: 12, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 190, damping: 23 }}
      >
      <div className="flex items-start justify-between gap-4">
        <div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black ring-1 ${status.tone}`}
          >
            <span className={`h-2 w-2 rounded-full ${status.dot}`} />
            {status.label}
          </span>
          <h3 className="mt-3 text-2xl font-black leading-tight text-slate-950">
            {ticket.title}
          </h3>
        </div>
        <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-right">
          <p className="text-xs font-bold text-emerald-600">Tiền thưởng</p>
          <p className="text-xl font-black text-emerald-700">
            {formatEth(ticket.amount)} ETH
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        <InfoRow label="Người tạo" value={shortAddress(ticket.company)} icon={UserRound} />
        <InfoRow
          label="Worker"
          value={ticket.worker === ZERO_ADDRESS ? "Chưa nhận" : shortAddress(ticket.worker)}
          icon={UserRound}
        />
        <InfoRow label="Thời hạn" value={formatUnixDate(ticket.deadline)} icon={AlertTriangle} />
        <InfoRow
          label="Linh vuc"
          value={categoryLabels[ticket.category] || "Khac"}
          icon={FileCheck2}
        />
        <InfoRow
          label="CID chi tiết"
          value={ticket.detailsCID || "-"}
          icon={FileCheck2}
          href={detailsUrl}
          wrap
        />
        <InfoRow
          label="CID minh chứng"
          value={ticket.proofCID || "-"}
          icon={FileCheck2}
          href={proofUrl}
          wrap
        />
        <InfoRow label="Ghi chú minh chứng" value={ticket.proofNote || "-"} icon={Send} wrap />
        {ticket.rejectionReason && (
          <InfoRow
            label="Lý do yêu cầu nộp lại"
            value={ticket.rejectionReason}
            icon={GitPullRequestDraft}
            wrap
          />
        )}
      </div>

      <div className="mt-6 space-y-3">
        {isOpen && !role.isCompany && (
          <ActionButton
            icon={BadgeCheck}
            disabled={disabled}
            label="Nhận Ticket"
            onClick={() => onAction(ticket, { type: "claim", label: "Nhận Ticket" })}
          />
        )}

        {isOpen && role.isCompany && (
          <ActionButton
            icon={Ban}
            tone="danger"
            disabled={disabled}
            label="Hủy Ticket"
            onClick={() => onAction(ticket, { type: "cancel", label: "Hủy Ticket" })}
          />
        )}

        {role.isWorker && isClaimed && (
          <div className="rounded-3xl border border-blue-100 bg-blue-50/70 p-4">
            <h4 className="flex items-center gap-2 text-sm font-black text-blue-900">
              <FileCheck2 className="h-4 w-4" />
              Nộp minh chứng
            </h4>
            <input
              value={proofCID}
              onChange={(event) => setProofCID(event.target.value)}
              placeholder="ipfs://proof-cid"
              className="mt-3 w-full rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />
            <input
              type="file"
              onChange={(event) => setProofFile(event.target.files?.[0] || null)}
              className="mt-3 w-full rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm file:mr-4 file:rounded-xl file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-xs file:font-black file:text-blue-700"
            />
            {proofFile && (
              <p className="mt-2 text-xs font-semibold text-blue-700">
                Se upload proof len IPFS: {proofFile.name}
              </p>
            )}
            <textarea
              value={proofNote}
              onChange={(event) => setProofNote(event.target.value)}
              placeholder="Mô tả phần việc đã hoàn thành..."
              rows={3}
              className="mt-3 w-full resize-none rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />
            <ActionButton
              icon={Send}
              disabled={disabled || uploadingProof || (!proofCID.trim() && !proofFile)}
              label="Nộp minh chứng"
              onClick={submitProof}
              className="mt-3"
            />
          </div>
        )}

        {role.isCompany && isSubmitted && (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <ActionButton
                icon={CheckCircle2}
                tone="success"
                disabled={disabled}
                label="Duyệt thanh toán"
                onClick={() =>
                  onAction(ticket, { type: "approve", label: "Duyệt thanh toán" })
                }
              />
              <ActionButton
                icon={Scale}
                tone="danger"
                disabled={disabled}
                label="Mở tranh chấp"
                onClick={() =>
                  onAction(ticket, {
                    type: "company-dispute",
                    label: "Mở tranh chấp",
                  })
                }
              />
            </div>

            <div className="rounded-3xl border border-amber-100 bg-amber-50/80 p-4">
              <h4 className="text-sm font-black text-amber-900">
                Yêu cầu nộp lại
              </h4>
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Mô tả nội dung cần chỉnh sửa hoặc nộp lại..."
                rows={3}
                className="mt-3 w-full resize-none rounded-2xl border border-amber-100 bg-white px-4 py-3 text-sm outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
              />
              <ActionButton
                icon={GitPullRequestDraft}
                tone="warning"
                disabled={disabled || !reason.trim()}
                label="Yêu cầu nộp lại"
                onClick={requestResubmission}
                className="mt-3"
              />
            </div>
          </div>
        )}

        {role.isWorker && isSubmitted && (
          <ActionButton
            icon={Scale}
            tone="danger"
            disabled={disabled || !canWorkerDispute}
            label="Mở tranh chấp"
            onClick={() =>
              onAction(ticket, { type: "worker-dispute", label: "Mở tranh chấp" })
            }
          />
        )}

        {role.isArbiter && isDisputed && (
          <div className="rounded-3xl border border-violet-100 bg-violet-50/80 p-4">
            <h4 className="flex items-center gap-2 text-sm font-black text-violet-900">
              <Scale className="h-4 w-4" />
              Bảng bỏ phiếu Arbiter
            </h4>
            {selectedDisputeArbiters.length > 0 && (
              <div className="mt-3 rounded-2xl bg-white/80 px-3 py-2 text-xs font-bold text-violet-700 ring-1 ring-violet-100">
                <p className="font-black uppercase text-violet-400">
                  Arbiter duoc chon
                </p>
                <p className="mt-1 break-all">
                  {selectedDisputeArbiters.map(shortAddress).join(", ")}
                </p>
              </div>
            )}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-2xl bg-white/80 px-3 py-2 ring-1 ring-violet-100">
                <p className="text-[11px] font-black uppercase text-violet-400">
                  Tra Worker
                </p>
                <p className="mt-1 text-sm font-black text-violet-900">
                  {voteSummary?.forWorker || 0}/{requiredVotes || arbiters.length}
                </p>
              </div>
              <div className="rounded-2xl bg-white/80 px-3 py-2 ring-1 ring-violet-100">
                <p className="text-[11px] font-black uppercase text-violet-400">
                  Hoan Company
                </p>
                <p className="mt-1 text-sm font-black text-violet-900">
                  {voteSummary?.forCompany || 0}/{requiredVotes || arbiters.length}
                </p>
              </div>
            </div>
            {hasCurrentArbiterVoted && (
              <p className="mt-2 rounded-2xl bg-white/80 px-3 py-2 text-xs font-bold text-violet-700 ring-1 ring-violet-100">
                Ví arbiter này đã bỏ phiếu cho ticket này.
              </p>
            )}
            {!hasCurrentArbiterVoted && (
              <button
                type="button"
                disabled={disabled}
                onClick={() =>
                  onAction(ticket, {
                    type: "decline-dispute",
                    label: "Tu choi xu ly tranh chap",
                  })
                }
                className="mt-3 w-full rounded-2xl border border-violet-100 bg-white px-4 py-3 text-xs font-black text-violet-700 transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Tu choi xu ly tranh chap
              </button>
            )}
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <ActionButton
                icon={CheckCircle2}
                tone="success"
                disabled={disabled || hasCurrentArbiterVoted}
                label={hasCurrentArbiterVoted ? "Đã bỏ phiếu" : "Bỏ phiếu trả Worker"}
                onClick={() =>
                  onAction(
                    ticket,
                    { type: "vote", label: "Bỏ phiếu trả Worker" },
                    { payWorker: true }
                  )
                }
              />
              <ActionButton
                icon={Ban}
                tone="danger"
                disabled={disabled || hasCurrentArbiterVoted}
                label={hasCurrentArbiterVoted ? "Đã bỏ phiếu" : "Bỏ phiếu hoàn tiền Company"}
                onClick={() =>
                  onAction(
                    ticket,
                    { type: "vote", label: "Bỏ phiếu hoàn tiền Company" },
                    { payWorker: false }
                  )
                }
              />
            </div>
          </div>
        )}
      </div>
      </motion.section>
    </AnimatePresence>
  );
}

function InfoRow({ label, value, icon, href, wrap }) {
  const hasLink = href && value && value !== "-";

  return (
    <div className="rounded-2xl border border-[#E6EAF5] bg-white/78 px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600">
          {createElement(icon, { className: "h-4 w-4" })}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
            {label}
          </p>
          <p
            className={`mt-1 text-sm font-bold text-slate-800 ${
              wrap ? "break-all leading-6" : ""
            }`}
          >
            {value}
          </p>
          {hasLink && (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 ring-1 ring-blue-100 transition hover:bg-blue-100"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Mở file
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
  disabled,
  tone = "primary",
  className = "",
}) {
  const styles = {
    primary: "from-blue-600 to-violet-600 text-white shadow-blue-500/25",
    success: "from-emerald-500 to-teal-500 text-white shadow-emerald-500/20",
    danger: "from-rose-500 to-red-600 text-white shadow-rose-500/20",
    warning: "from-amber-400 to-orange-500 text-white shadow-amber-500/20",
  };

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r px-4 py-3 text-sm font-black shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 ${styles[tone]} ${className}`}
    >
      {createElement(icon, { className: "h-4 w-4" })}
      {label}
    </button>
  );
}
