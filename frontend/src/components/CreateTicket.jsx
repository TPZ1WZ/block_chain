import { useState } from "react";
import { ethers } from "ethers";
import { getTicketBoard } from "../lib/contracts";

function utcToTimestamp(year, month, day, hour, minute, second = 0) {
  return Math.floor(
    Date.UTC(year, month - 1, day, hour, minute, second) / 1000
  );
}

export default function CreateTicket({ signer, onCreated }) {
  const defaultFuture = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const defaultDatetimeLocal = defaultFuture.toISOString().slice(0, 16);

  const [title, setTitle] = useState("");
  const [detailsCID, setDetailsCID] = useState("");
  const [amount, setAmount] = useState("0.1");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [deadlineLocal, setDeadlineLocal] = useState(defaultDatetimeLocal);

  const deadline = deadlineLocal ? Math.floor(new Date(deadlineLocal).getTime() / 1000) : 0;
  const nowUtc = Math.floor(Date.now() / 1000);

  async function create() {
    if (!signer) return alert("⚠️ Please connect wallet");
    if (!title.trim()) return alert("❌ Ticket title is required");
    if (deadline <= nowUtc) return alert("❌ Deadline must be in the future (UTC)");

    let value;
    try {
      value = ethers.parseEther(amount);
      if (value === 0n) throw new Error();
    } catch {
      return alert("❌ Invalid ETH amount");
    }

    try {
      setLoading(true);
      setError(null);

      const board = getTicketBoard(signer);
      const tx = await board.createTicket(
        title.trim(),
        detailsCID.trim(),
        deadline,
        { value }
      );

      await tx.wait();

      alert("✅ Ticket created successfully!");
      setTitle("");
      setDetailsCID("");
      setAmount("0.1");
      onCreated?.();
    } catch (e) {
      console.error(e);
      const msg =
        e.reason || e.data?.message || e.message || "Transaction failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 space-y-6 max-w-2xl mx-auto">
      <h3 className="text-xl font-bold flex items-center gap-2">
        🎫 Create Ticket
      </h3>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Ticket Title
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="E.g. Visit branch and take product display photos"
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-black"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Details CID / Reference
        </label>
        <input
          type="text"
          value={detailsCID}
          onChange={(e) => setDetailsCID(e.target.value)}
          placeholder="ipfs://..."
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-black"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Reward Amount (ETH)
        </label>
        <input
          type="text"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-black"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Deadline (UTC)
        </label>

        <input
          type="datetime-local"
          value={deadlineLocal}
          onChange={(e) => setDeadlineLocal(e.target.value)}
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-black"
        />
        <p className="text-sm text-indigo-600 mt-2">
          On-chain UTC:{" "}
          {deadline > nowUtc ? new Date(deadline * 1000).toUTCString() : "⚠️ Deadline phải ở tương lai"}
        </p>
      </div>

      <button
        onClick={create}
        disabled={loading || deadline <= nowUtc}
        className="w-full bg-black text-white py-3 rounded-lg hover:bg-gray-800 disabled:opacity-50"
      >
        {loading ? "⏳ Creating..." : "Create Ticket & Lock ETH"}
      </button>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
          ❌ {error}
        </p>
      )}
    </div>
  );
}