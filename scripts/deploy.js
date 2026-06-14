const hre = require("hardhat");
const { ethers } = hre;
const fs = require("fs");
const path = require("path");

async function main() {
  const signers = await ethers.getSigners();
  const deployer = signers[0];

  console.log("Deploying with:", deployer.address);

  const arbiters = [
    "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
    "0xa0Ee7A142d267C1f36714E4a8F75612F20a79720",
    "0xdF3e18d64BC6A983f673Ab319CCaE4f1a57C7097",
    "0xcd3B766CCDd6AE721141F452C550Ca635964ce71",
    "0x2546BcD3c84621e976D8185a91A922aE77ECEc30",
    "0xbDA5747bFD65F08deb54cb465eB87D40e51B197E",
  ];
  const required = 2;

  const DisputeMultiSig = await ethers.getContractFactory("DisputeMultiSig");
  const multisig = await DisputeMultiSig.deploy(arbiters, required);
  await multisig.waitForDeployment();

  const multisigAddress = await multisig.getAddress();
  console.log("DisputeMultiSig deployed:", multisigAddress);

  const signerByAddress = new Map(
    signers.map((signer) => [signer.address.toLowerCase(), signer])
  );
  const minStake = await multisig.minStake();

  console.log("Staking real ETH for genesis arbiters...");
  for (const arbiter of arbiters) {
    const arbiterSigner = signerByAddress.get(arbiter.toLowerCase());
    if (!arbiterSigner) {
      throw new Error(`Missing local signer for arbiter ${arbiter}`);
    }

    const stakeTx = await multisig
      .connect(arbiterSigner)
      .stakeAsArbiter({ value: minStake });
    await stakeTx.wait();

    console.log(`  staked ${ethers.formatEther(minStake)} ETH from ${arbiter}`);
  }

  const TicketBoard = await ethers.getContractFactory("TicketBoard");
  const board = await TicketBoard.deploy(multisigAddress);
  await board.waitForDeployment();

  const boardAddress = await board.getAddress();
  console.log("TicketBoard deployed:", boardAddress);

  const deadline = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;
  const amount = ethers.parseEther("1");
  const title = "Demo Ticket - Install POSM";
  const detailsCID = "ipfs://demo-ticket-details-cid";

  const tx = await board.createTicket(title, detailsCID, deadline, {
    value: amount,
  });
  const receipt = await tx.wait();

  const event = receipt.logs.find((l) => l.fragment?.name === "TicketCreated");
  if (!event) {
    throw new Error("TicketCreated event not found");
  }

  const ticketAddress = event.args.escrow;
  console.log("Demo Ticket created:", ticketAddress);

  const deployment = {
    board: boardAddress,
    multisig: multisigAddress,
    demoTicket: ticketAddress,
    arbiters,
    required,
    genesisStake: ethers.formatEther(minStake),
  };

  const outDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  fs.writeFileSync(
    path.join(outDir, "localhost.json"),
    JSON.stringify(deployment, null, 2)
  );

  console.log("\nDEPLOY COMPLETED");
  console.log(deployment);
}

main().catch((error) => {
  console.error("Deployment failed");
  console.error(error);
  process.exitCode = 1;
});
