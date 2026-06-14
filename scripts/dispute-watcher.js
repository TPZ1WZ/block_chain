/**
 * Dispute Watcher — tự động gọi progressRound khi round deadline qua
 * Chạy: node scripts/dispute-watcher.js
 * Gas trả từ ví deployer (account #0)
 */
require("dotenv").config();

const { ethers } = require("ethers");

const RPC_URL     = "http://127.0.0.1:8545";
const BOARD_ABI   = require("../artifacts/contracts/TicketBoard.sol/TicketBoard.json").abi;
const ESCROW_ABI  = require("../artifacts/contracts/TicketEscrow.sol/TicketEscrow.json").abi;
const MULTISIG_ABI = require("../artifacts/contracts/DisputeMultiSig.sol/DisputeMultiSig.json").abi;

const BOARD_ADDRESS   = process.env.BOARD_ADDRESS   || require("../deployments/localhost.json").board;
const MULTISIG_ADDRESS = process.env.MULTISIG_ADDRESS || require("../deployments/localhost.json").multisig;

// Deployer key (Hardhat account #0) — chỉ dùng local
const DEPLOYER_KEY =
  process.env.KEEPER_PRIVATE_KEY ||
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const CHECK_INTERVAL_MS = 30_000; // kiểm tra mỗi 30 giây

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const signer   = new ethers.Wallet(DEPLOYER_KEY, provider);
  const board    = new ethers.Contract(BOARD_ADDRESS, BOARD_ABI, provider);
  const multisig = new ethers.Contract(MULTISIG_ADDRESS, MULTISIG_ABI, provider);

  console.log("🔍 Dispute Watcher started");
  console.log(`   Board:   ${BOARD_ADDRESS}`);
  console.log(`   Watcher: ${signer.address}`);
  console.log(`   Check every ${CHECK_INTERVAL_MS / 1000}s\n`);

  async function checkAndProgress() {
    try {
      const count = await board.totalTickets();

      for (let i = 0; i < count; i++) {
        const ticketAddr = await board.tickets(i);
        const escrow     = new ethers.Contract(ticketAddr, ESCROW_ABI, signer);
        const status     = await escrow.status();

        // Chỉ xử lý ticket đang Disputed (status = 3)
        if (Number(status) !== 3) continue;

        const [round, , expired] = await multisig.getRoundInfo(ticketAddr);

        if (!expired) continue;

        console.log(`⏰ [${new Date().toLocaleTimeString()}] Ticket ${ticketAddr.slice(0,10)}... vòng ${round} hết hạn → progressRound`);

        const tx = await escrow.progressDisputeRound({ gasLimit: 900_000 });
        await tx.wait();

        console.log(`   ✅ Done — tx: ${tx.hash.slice(0, 16)}...`);
      }
    } catch (err) {
      console.error("❌ Watcher error:", err.message);
    }
  }

  // Chạy ngay lần đầu rồi lặp lại
  await checkAndProgress();
  setInterval(checkAndProgress, CHECK_INTERVAL_MS);
}

main();
