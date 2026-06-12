import { createElement, useCallback, useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Settings,
  History,
  Wallet,
  X,
} from "lucide-react";

import Layout from "./components/Layout";
import CreateTicketForm from "./components/CreateTicketForm";
import FeatureCards from "./components/FeatureCards";
import FlowSteps from "./components/FlowSteps";
import HeroSection from "./components/HeroSection";
import TicketBoard from "./components/TicketBoard";
import TicketDetailPanel from "./components/TicketDetailPanel";
import WalletCard from "./components/WalletCard";
import { getMultiSig, getTicketBoard, getTicketEscrow } from "./lib/contracts";
import { CHAIN_ID, MULTISIG_ADDRESS, TICKET_BOARD_ADDRESS } from "./config";
import { formatEth, formatUnixDate, shortAddress } from "./utils/format";
import { getStatusMeta } from "./utils/status";

function normalizeError(error) {
  return (
    error?.reason ||
    error?.data?.message ||
    error?.shortMessage ||
    error?.message ||
    "Giao dịch thất bại"
  );
}

export default function App() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [address, setAddress] = useState("");
  const [balance, setBalance] = useState("0");
  const [networkName, setNetworkName] = useState("Hardhat Local");

  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [arbiters, setArbiters] = useState([]);
  const [activePage, setActivePage] = useState("overview");
  const [boardTab, setBoardTab] = useState("all");
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [walletError, setWalletError] = useState("");
  const [txState, setTxState] = useState({ stage: "idle", label: "" });
  const [toasts, setToasts] = useState([]);

  const isConnected = Boolean(signer && address);

  function pushToast(type, message) {
    const id = crypto.randomUUID();
    setToasts((items) => [...items, { id, type, message }]);
    window.setTimeout(() => {
      setToasts((items) => items.filter((item) => item.id !== id));
    }, 4200);
  }

  const connectWallet = useCallback(async () => {
    if (!window.ethereum) {
      setWalletError("Vui lòng cài MetaMask hoặc ví tương thích EIP-1193.");
      return;
    }

    try {
      setWalletError("");
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      await browserProvider.send("eth_requestAccounts", []);
      const nextSigner = await browserProvider.getSigner();
      const nextAddress = await nextSigner.getAddress();
      const network = await browserProvider.getNetwork();

      setProvider(browserProvider);
      setSigner(nextSigner);
      setAddress(nextAddress);
      setNetworkName(
        Number(network.chainId) === CHAIN_ID
          ? "Hardhat Local"
          : network.name || `Chain ${network.chainId}`
      );
      pushToast("success", "Đã kết nối ví");
    } catch (error) {
      setWalletError(normalizeError(error));
      pushToast("error", normalizeError(error));
    }
  }, []);

  const refreshWallet = useCallback(async () => {
    if (!window.ethereum || !provider || !address) return;
    try {
      const [rawBalance, network] = await Promise.all([
        provider.getBalance(address),
        provider.getNetwork(),
      ]);
      setBalance(formatEth(rawBalance));
      setNetworkName(
        Number(network.chainId) === CHAIN_ID
          ? "Hardhat Local"
          : network.name || `Chain ${network.chainId}`
      );
    } catch (error) {
      console.error("refreshWallet failed", error);
    }
  }, [address, provider]);

  const readTicket = useCallback(async (ticketAddress, runner) => {
    const escrow = getTicketEscrow(ticketAddress, runner);
    const [
      company,
      worker,
      title,
      detailsCID,
      amount,
      deadline,
      status,
      proofCID,
      proofNote,
      rejectionReason,
    ] = await Promise.all([
      escrow.company(),
      escrow.worker(),
      escrow.title(),
      escrow.detailsCID(),
      escrow.amount(),
      escrow.deadline(),
      escrow.status(),
      escrow.proofCID(),
      escrow.proofNote(),
      escrow.rejectionReason(),
    ]);

    return {
      address: ticketAddress,
      company,
      worker,
      title,
      detailsCID,
      amount: amount.toString(),
      deadline: Number(deadline),
      status: Number(status),
      proofCID,
      proofNote,
      rejectionReason,
    };
  }, []);

  const loadTickets = useCallback(async () => {
    if (!window.ethereum) return;

    try {
      setLoadingTickets(true);
      const readProvider = provider || new ethers.BrowserProvider(window.ethereum);
      const board = getTicketBoard(readProvider);
      const addresses = await board.getAllTickets();
      const nextTickets = await Promise.all(
        addresses.map((ticketAddress) => readTicket(ticketAddress, readProvider))
      );

      setTickets(nextTickets);
      setSelectedTicket((current) => {
        if (!current) return null;
        return (
          nextTickets.find(
            (ticket) => ticket.address.toLowerCase() === current.address.toLowerCase()
          ) || null
        );
      });
    } catch (error) {
      console.error("loadTickets failed", error);
      pushToast("error", normalizeError(error));
    } finally {
      setLoadingTickets(false);
    }
  }, [provider, readTicket]);

  const loadArbiters = useCallback(async () => {
    if (!provider) return;
    try {
      const multisig = getMultiSig(provider);
      setArbiters(await multisig.getArbiters());
    } catch (error) {
      console.error("loadArbiters failed", error);
      setArbiters([]);
    }
  }, [provider]);

  async function runTransaction(label, callback) {
    if (!signer) {
      pushToast("error", "Vui lòng kết nối ví trước khi gửi giao dịch");
      return;
    }

    try {
      setTxState({ stage: "wallet", label });
      const tx = await callback();
      setTxState({ stage: "pending", label });
      await tx.wait();
      setTxState({ stage: "confirmed", label });
      pushToast("success", `${label} đã xác nhận`);
      await Promise.all([loadTickets(), refreshWallet()]);
      window.setTimeout(() => setTxState({ stage: "idle", label: "" }), 1400);
    } catch (error) {
      const message = normalizeError(error);
      setTxState({ stage: "error", label: message });
      pushToast("error", message);
    }
  }

  async function createTicket(form) {
    await runTransaction("Tạo Ticket", async () => {
      const board = getTicketBoard(signer);
      return board.createTicket(form.title, form.detailsCID, form.deadline, {
        value: ethers.parseEther(form.amount),
      });
    });
  }

  async function ticketAction(ticket, action, payload = {}) {
    await runTransaction(action.label, async () => {
      const escrow = getTicketEscrow(ticket.address, signer);

      if (action.type === "claim") return escrow.claimTicket();
      if (action.type === "cancel") return escrow.cancelOpenTicket();
      if (action.type === "approve") return escrow.approveSubmission();
      if (action.type === "resubmit") return escrow.requestResubmission(payload.reason);
      if (action.type === "company-dispute") return escrow.disputeByCompany();
      if (action.type === "worker-dispute") return escrow.disputeByWorker();
      if (action.type === "submit-proof") {
        return escrow.submitProof(payload.proofCID, payload.proofNote);
      }
      if (action.type === "vote") {
        const multisig = getMultiSig(signer);
        return multisig.vote(ticket.address, payload.payWorker);
      }

      throw new Error("Hành động chưa được hỗ trợ");
    });
  }

  useEffect(() => {
    if (!window.ethereum) return undefined;

    const handleAccountsChanged = () => {
      setSigner(null);
      setAddress("");
      setSelectedTicket(null);
      connectWallet();
    };

    const handleChainChanged = () => {
      window.location.reload();
    };

    window.ethereum.on?.("accountsChanged", handleAccountsChanged);
    window.ethereum.on?.("chainChanged", handleChainChanged);

    return () => {
      window.ethereum.removeListener?.("accountsChanged", handleAccountsChanged);
      window.ethereum.removeListener?.("chainChanged", handleChainChanged);
    };
  }, [connectWallet]);

  useEffect(() => {
    if (!provider) return;
    refreshWallet();
    loadTickets();
    loadArbiters();
  }, [loadArbiters, loadTickets, provider, refreshWallet]);

  const stats = useMemo(() => {
    const open = tickets.filter((ticket) => ticket.status === 0).length;
    const active = tickets.filter((ticket) => [1, 2].includes(ticket.status)).length;
    const paid = tickets.filter((ticket) => ticket.status === 4).length;
    const disputed = tickets.filter((ticket) => ticket.status === 3).length;
    return { open, active, paid, disputed, total: tickets.length };
  }, [tickets]);

  const myCreatedTickets = useMemo(() => {
    if (!address) return [];
    return tickets.filter(
      (ticket) => ticket.company.toLowerCase() === address.toLowerCase()
    );
  }, [address, tickets]);

  const myClaimedTickets = useMemo(() => {
    if (!address) return [];
    return tickets.filter(
      (ticket) => ticket.worker.toLowerCase() === address.toLowerCase()
    );
  }, [address, tickets]);

  const pendingTickets = useMemo(
    () =>
      [...myCreatedTickets, ...myClaimedTickets].filter((ticket) =>
        [1, 2, 3].includes(ticket.status)
      ),
    [myClaimedTickets, myCreatedTickets]
  );

  function renderPage() {
    const commonBoardProps = {
      onSelect: (ticket) => {
        setSelectedTicket(ticket);
        setTimeout(() => {
          document.getElementById("ticket-detail-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 80);
      },
      selectedTicket,
      address,
      loading: loadingTickets,
      onTicketAction: ticketAction,
    };

    if (activePage === "create") {
      return (
        <section className="grid grid-cols-1 gap-7 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <PageIntro
              title="Tạo Ticket mới"
              description="Nhập thông tin công việc, khóa ETH vào Smart Contract Escrow và chờ Worker nhận việc."
            />
            <CreateTicketForm
              disabled={!isConnected}
              isBusy={txState.stage !== "idle"}
              onCreate={createTicket}
            />
          </div>
          <aside className="space-y-5">
            <GuideCard />
            <WalletCard
              address={address}
              balance={balance}
              networkName={networkName}
              isConnected={isConnected}
              onConnect={connectWallet}
            />
          </aside>
        </section>
      );
    }

    if (activePage === "board") {
      return (
        <section className="grid grid-cols-1 gap-7 lg:grid-cols-[minmax(0,1fr)_360px]">
          <TicketBoard
            tickets={tickets}
            activeTab={boardTab}
            onTabChange={setBoardTab}
            onCreateTicket={() => setActivePage("create")}
            {...commonBoardProps}
          />
          <div id="ticket-detail-panel">
            <TicketDetailPanel
              ticket={selectedTicket}
              address={address}
              arbiters={arbiters}
              disabled={!isConnected || txState.stage !== "idle"}
              onAction={ticketAction}
            />
          </div>
        </section>
      );
    }

    if (activePage === "myTickets") {
      return (
        <section className="space-y-6">
          <PageIntro
            title="Ticket của tôi"
            description="Theo dõi các ticket bạn đã tạo, đã nhận hoặc đang chờ xử lý."
          />
          <MyTicketsPage
            created={myCreatedTickets}
            claimed={myClaimedTickets}
            pending={pendingTickets}
            commonBoardProps={commonBoardProps}
          />
        </section>
      );
    }

    if (activePage === "wallet") {
      return (
        <section className="grid grid-cols-1 gap-7 xl:grid-cols-[420px_minmax(0,1fr)]">
          <WalletCard
            address={address}
            balance={balance}
            networkName={networkName}
            isConnected={isConnected}
            onConnect={connectWallet}
          />
          <InfoPanel
            icon={Wallet}
            title="Thông tin ví"
            items={[
              ["Địa chỉ ví", address || "Chưa kết nối"],
              ["Số dư", `${balance} ETH`],
              ["Mạng hiện tại", networkName],
              ["Gợi ý", "Hãy chọn Hardhat Local để demo với ETH giả."],
            ]}
          />
        </section>
      );
    }

    if (activePage === "history") {
      const myTickets = tickets.filter(
        (t) =>
          t.company.toLowerCase() === address.toLowerCase() ||
          (t.worker && t.worker !== "0x0000000000000000000000000000000000000000" && t.worker.toLowerCase() === address.toLowerCase())
      );
      return (
        <section className="space-y-4">
          <div className="rounded-[32px] border border-[#E6EAF5] bg-white/82 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.07)] backdrop-blur-xl md:p-7">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
              <History className="h-3.5 w-3.5" />
              Lịch sử
            </div>
            <h2 className="mt-3 text-2xl font-black text-slate-950">Lịch sử giao dịch</h2>
            <p className="mt-1 text-sm text-slate-500">Các ticket bạn đã tạo hoặc tham gia với ví <span className="font-mono font-bold text-slate-700">{shortAddress(address)}</span></p>
          </div>
          {!isConnected ? (
            <div className="rounded-3xl border border-dashed border-[#E6EAF5] bg-slate-50/80 p-12 text-center">
              <History className="mx-auto mb-3 h-10 w-10 text-slate-300" />
              <p className="font-bold text-slate-500">Kết nối ví để xem lịch sử</p>
            </div>
          ) : myTickets.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[#E6EAF5] bg-slate-50/80 p-12 text-center">
              <History className="mx-auto mb-3 h-10 w-10 text-slate-300" />
              <p className="font-bold text-slate-500">Chưa có giao dịch nào</p>
              <p className="mt-1 text-sm text-slate-400">Tạo ticket hoặc nhận việc để bắt đầu</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myTickets.map((t) => {
                const st = getStatusMeta(t.status);
                const isCompany = t.company.toLowerCase() === address.toLowerCase();
                return (
                  <div
                    key={t.address}
                    onClick={() => { setSelectedTicket(t); setActivePage("board"); }}
                    className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-[#E6EAF5] bg-white px-5 py-4 shadow-sm transition hover:border-blue-200 hover:shadow-md"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-lg">
                        {isCompany ? "🏢" : "👷"}
                      </div>
                      <div>
                        <p className="font-black text-slate-900">{t.title}</p>
                        <p className="text-xs text-slate-400">{isCompany ? "Người tạo" : "Worker"} • {formatUnixDate(t.createdAt || t.deadline)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black ring-1 ${st.tone}`}>
                        <span className={`h-2 w-2 rounded-full ${st.dot}`} />
                        {st.label}
                      </span>
                      <span className="font-black text-emerald-600">{formatEth(t.amount)} ETH</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      );
    }

    if (activePage === "guide") {
      return (
        <section className="space-y-6">
          <div className="rounded-[32px] border border-[#E6EAF5] bg-white/82 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.07)] backdrop-blur-xl md:p-7">
            <div className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">
              📖 Hướng dẫn sử dụng
            </div>
            <h2 className="mt-3 text-2xl font-black text-slate-950">Hướng dẫn sử dụng OpenTask</h2>
            <p className="mt-1 text-sm text-slate-500">Tìm hiểu cách hệ thống ký quỹ Web3 hoạt động và các bước thực hiện.</p>
          </div>
          <FeatureCards />
          <FlowSteps />
          <div className="rounded-[32px] border border-[#E6EAF5] bg-white/82 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.07)] backdrop-blur-xl md:p-7 space-y-4">
            <h3 className="text-lg font-black text-slate-950">❓ Câu hỏi thường gặp</h3>
            {[
              ["ETH bị khóa ở đâu?", "ETH được khóa trong Smart Contract Escrow — không ai có thể lấy ra nếu không đúng điều kiện, kể cả admin."],
              ["Nếu Company không trả tiền thì sao?", "Worker có thể mở tranh chấp sau deadline. 3 arbiter sẽ bỏ phiếu độc lập, 2/3 quyết định người thắng."],
              ["Arbiter là ai?", "Là 3 địa chỉ ví được cấu hình sẵn khi deploy contract, đóng vai trò trọng tài trung lập."],
              ["Phí giao dịch là bao nhiêu?", "Chỉ phí gas của mạng Ethereum/Hardhat. Hệ thống không thu phí dịch vụ."],
            ].map(([q, a]) => (
              <div key={q} className="rounded-2xl border border-[#E6EAF5] bg-slate-50 p-4">
                <p className="font-black text-slate-800">Q: {q}</p>
                <p className="mt-1 text-sm text-slate-500">A: {a}</p>
              </div>
            ))}
          </div>
        </section>
      );
    }

    if (activePage === "settings") {
      return (
        <InfoPanel
          icon={Settings}
          title="Cài đặt hệ thống"
          description="Thông tin cấu hình smart contract đang được frontend sử dụng."
          items={[
            ["Mạng", networkName],
            ["Chain ID", String(CHAIN_ID)],
            ["TicketBoard", TICKET_BOARD_ADDRESS],
            ["DisputeMultiSig", MULTISIG_ADDRESS],
            ["Giao diện", "Sáng, Web3 SaaS"],
          ]}
        />
      );
    }

    return (
      <>
        <HeroSection stats={stats} />
        <section className="grid grid-cols-1 gap-7 xl:grid-cols-[minmax(0,1fr)_320px]">
          <TicketBoard
            tickets={tickets.slice(0, 4)}
            activeTab="all"
            onTabChange={() => {}}
            showTabs={false}
            title="Ticket mới nhất"
            {...commonBoardProps}
          />
          <aside className="space-y-5">
            <WalletCard
              address={address}
              balance={balance}
              networkName={networkName}
              isConnected={isConnected}
              onConnect={connectWallet}
            />
            <TicketDetailPanel
              ticket={selectedTicket}
              address={address}
              arbiters={arbiters}
              disabled={!isConnected || txState.stage !== "idle"}
              onAction={ticketAction}
            />
          </aside>
        </section>
      </>
    );
  }

  const notifications = useMemo(() => {
    if (!address || !tickets.length) return [];
    const now = Math.floor(Date.now() / 1000);
    const result = [];
    const addr = address.toLowerCase();
    for (const t of tickets) {
      // Worker: proof bị từ chối → cần nộp lại
      if (t.status === 1 && t.rejectionReason && t.worker?.toLowerCase() === addr) {
        result.push({ id: `reject-${t.address}`, icon: "⚠️", title: `Minh chứng bị từ chối`, body: `"${t.title}" — ${t.rejectionReason}` });
      }
      // Company: worker đã nộp proof → cần duyệt
      if (t.status === 2 && t.company?.toLowerCase() === addr) {
        result.push({ id: `submitted-${t.address}`, icon: "📋", title: `Worker đã nộp minh chứng`, body: `"${t.title}" — vui lòng xem xét và duyệt thanh toán` });
      }
      // Worker: đã nộp proof, deadline qua, company chưa phản hồi → có thể mở tranh chấp
      if (t.status === 2 && t.deadline < now && t.worker?.toLowerCase() === addr) {
        result.push({ id: `dispute-${t.address}`, icon: "⏰", title: `Deadline đã qua, có thể mở tranh chấp`, body: `"${t.title}" — Company chưa phản hồi` });
      }
    }
    return result;
  }, [address, tickets]);

  return (
    <Layout
      address={address}
      balance={balance}
      isConnected={isConnected}
      activePage={activePage}
      onPageChange={setActivePage}
      onConnect={connectWallet}
      networkName={networkName}
      walletError={walletError}
      notifications={notifications}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={activePage}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          {renderPage()}
        </motion.div>
      </AnimatePresence>

      {txState.stage !== "idle" && (
        <div className="fixed bottom-6 left-1/2 z-50 w-[calc(100%-32px)] max-w-md -translate-x-1/2 rounded-2xl border border-white/70 bg-white/90 p-4 shadow-2xl shadow-blue-900/15 backdrop-blur">
          <div className="flex items-center gap-3">
            {txState.stage === "error" ? (
              <AlertCircle className="h-5 w-5 text-rose-500" />
            ) : txState.stage === "confirmed" ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            ) : (
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            )}
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {txState.stage === "wallet" && "Đang chờ xác nhận trong ví"}
                {txState.stage === "pending" && "Giao dịch đang xử lý"}
                {txState.stage === "confirmed" && "Giao dịch đã xác nhận"}
                {txState.stage === "error" && "Giao dịch lỗi"}
              </p>
              <p className="text-xs text-slate-500">{txState.label}</p>
            </div>
          </div>
        </div>
      )}

      <div className="fixed right-5 top-5 z-50 space-y-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="flex min-w-72 items-start gap-3 rounded-2xl border border-white/70 bg-white/95 p-4 shadow-xl shadow-slate-900/10 backdrop-blur"
          >
            {toast.type === "success" ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-500" />
            ) : (
              <AlertCircle className="mt-0.5 h-5 w-5 text-rose-500" />
            )}
            <p className="flex-1 text-sm font-medium text-slate-700">{toast.message}</p>
            <button
              type="button"
              onClick={() =>
                setToasts((items) => items.filter((item) => item.id !== toast.id))
              }
              className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </Layout>
  );
}

function PageIntro({ title, description }) {
  return (
    <div className="rounded-[26px] border border-[#E6EAF5] bg-white/78 p-5 shadow-[0_16px_50px_rgba(15,23,42,0.055)] backdrop-blur">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">
        OpenTask
      </p>
      <h2 className="mt-2 text-3xl font-black tracking-tight text-[#071127]">
        {title}
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}

function GuideCard() {
  return (
    <div className="rounded-[26px] border border-[#E6EAF5] bg-white/78 p-5 shadow-[0_16px_50px_rgba(15,23,42,0.055)] backdrop-blur">
      <h3 className="text-lg font-black text-[#071127]">Hướng dẫn ký quỹ ETH</h3>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        Khi tạo ticket, ETH được khóa trong Smart Contract Escrow. Khoản ký quỹ
        chỉ được trả cho Worker khi bạn duyệt thanh toán hoặc được xử lý qua
        cơ chế tranh chấp.
      </p>
    </div>
  );
}

function MyTicketsPage({ created, claimed, pending, commonBoardProps }) {
  const [tab, setTab] = useState("created");
  const tabs = [
    { id: "created", label: "Tôi đã tạo", tickets: created },
    { id: "claimed", label: "Tôi đã nhận", tickets: claimed },
    { id: "pending", label: "Đang chờ xử lý", tickets: pending },
  ];
  const current = tabs.find((item) => item.id === tab) || tabs[0];

  return (
    <div className="space-y-5">
      <div className="flex gap-2 overflow-x-auto rounded-2xl border border-[#E6EAF5] bg-white/76 p-1.5">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`rounded-xl px-4 py-2.5 text-sm font-black transition ${
              tab === item.id
                ? "bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-lg shadow-blue-500/20"
                : "text-slate-500 hover:bg-white hover:text-slate-900"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <TicketBoard
        tickets={current.tickets}
        activeTab="all"
        onTabChange={() => {}}
        showTabs={false}
        title={current.label}
        {...commonBoardProps}
      />
    </div>
  );
}

function InfoPanel({ icon, title, description, items }) {
  return (
    <section className="rounded-[28px] border border-[#E6EAF5] bg-white/80 p-6 shadow-[0_18px_60px_rgba(15,23,42,0.07)] backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 text-white">
          {createElement(icon, { className: "h-5 w-5" })}
        </div>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">
            OpenTask
          </p>
          <h2 className="text-2xl font-black text-[#071127]">{title}</h2>
        </div>
      </div>

      {description && (
        <p className="mt-4 rounded-2xl border border-dashed border-[#E6EAF5] bg-slate-50/80 p-5 text-sm font-semibold leading-6 text-slate-500">
          {description}
        </p>
      )}

      {items.length > 0 && (
        <div className="mt-5 grid gap-3">
          {items.map(([label, value]) => (
            <div
              key={label}
              className="rounded-2xl border border-[#E6EAF5] bg-white/78 px-4 py-3"
            >
              <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                {label}
              </p>
              <p className="mt-1 break-all text-sm font-bold text-slate-800">
                {value}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
