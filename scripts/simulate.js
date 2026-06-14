const hre = require("hardhat");
const { ethers } = hre;
const deployment = require("../deployments/localhost.json");

async function main() {
  const signers = await ethers.getSigners();
  const [company, worker] = signers;
  const signerByAddress = new Map(
    signers.map((signer) => [signer.address.toLowerCase(), signer])
  );
  const disputeArbiters = deployment.arbiters.map((address) => {
    const signer = signerByAddress.get(address.toLowerCase());
    if (!signer) throw new Error(`Missing local signer for arbiter ${address}`);
    return signer;
  });

  console.log("=== ACTORS ===");
  console.log("Company   :", company.address);
  console.log("Worker    :", worker.address);
  console.log("Arbiter 1 :", disputeArbiters[0].address);
  console.log("Arbiter 2 :", disputeArbiters[1].address);
  console.log("Arbiter 3 :", disputeArbiters[2]?.address || "-");

  const ticket = await ethers.getContractAt("TicketEscrow", deployment.demoTicket);
  const multisig = await ethers.getContractAt("DisputeMultiSig", deployment.multisig);

  console.log("\n1. Worker claims ticket");
  await (await ticket.connect(worker).claimTicket()).wait();
  console.log("Ticket claimed");

  console.log("\n2. Worker submits proof");
  const proofCID = "ipfs://demo-proof-image-cid";
  const proofNote = "Completed installation and uploaded site photos";
  await (await ticket.connect(worker).submitProof(proofCID, proofNote)).wait();
  console.log("Proof submitted");

  console.log("\n3. Company opens dispute after ticket deadline");
  const deadline = await ticket.deadline();
  await ethers.provider.send("evm_setNextBlockTimestamp", [Number(deadline) + 1]);
  await ethers.provider.send("evm_mine", []);

  const disputeFee = await multisig.disputeFeeForTicket(deployment.demoTicket);
  await (await ticket.connect(company).disputeByCompany({ value: disputeFee })).wait();
  console.log("Dispute opened with fee:", ethers.formatEther(disputeFee), "ETH");

  console.log("\n4. Arbiters vote 2/3 to pay worker");
  await (await multisig.connect(disputeArbiters[0]).vote(deployment.demoTicket, true)).wait();
  console.log("Arbiter 1 voted pay worker");

  await (await multisig.connect(disputeArbiters[1]).vote(deployment.demoTicket, true)).wait();
  console.log("Arbiter 2 voted pay worker");

  const [forWorker, forCompany, resolved] = await multisig.getVotes(deployment.demoTicket);
  const status = await ticket.status();
  const balance = await ethers.provider.getBalance(worker.address);

  console.log("\n=== FINAL RESULT ===");
  console.log("Votes for worker :", forWorker.toString());
  console.log("Votes for company:", forCompany.toString());
  console.log("Resolved         :", resolved);
  console.log("Ticket status    :", status.toString());
  console.log("Worker balance   :", ethers.formatEther(balance), "ETH");
  console.log("\nFull ticket dispute flow completed");
}

main().catch((error) => {
  console.error("\nSimulation failed");
  console.error(error);
  process.exit(1);
});
