const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TicketEscrow + DisputeMultiSig - End-to-End Flow", function () {
  let company, worker, arbiter1, arbiter2, arbiter3, randomUser;
  let board, multisig;
  let ticket, ticketAddr;

  const REQUIRED_VOTES = 2;
  const ONE_DAY = 24 * 60 * 60;
  const TITLE = "Audit display at branch";
  const DETAILS_CID = "ipfs://flow-ticket";
  const PROOF_CID = "ipfs://flow-proof";
  const PROOF_NOTE = "Photos uploaded";
  const TICKET_VALUE = ethers.parseEther("1");

  async function movePastDeadline(targetTicket = ticket) {
    const deadline = await targetTicket.deadline();
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(deadline) + 1]);
    await ethers.provider.send("evm_mine", []);
  }

  async function openCompanyDispute(targetTicket = ticket, targetAddr = ticketAddr) {
    await movePastDeadline(targetTicket);
    const fee = await multisig.disputeFeeForTicket(targetAddr);
    return targetTicket.connect(company).disputeByCompany({ value: fee });
  }

  async function openWorkerDispute(targetTicket = ticket, targetAddr = ticketAddr) {
    await movePastDeadline(targetTicket);
    const fee = await multisig.disputeFeeForTicket(targetAddr);
    return targetTicket.connect(worker).disputeByWorker({ value: fee });
  }

  async function stakeArbiters(contract, arbiters) {
    const minStake = await contract.minStake();
    for (const arbiter of arbiters) {
      await contract.connect(arbiter).stakeAsArbiter({ value: minStake });
    }
  }

  beforeEach(async function () {
    [, company, worker, arbiter1, arbiter2, arbiter3, randomUser] =
      await ethers.getSigners();

    const DisputeMultiSig = await ethers.getContractFactory("DisputeMultiSig");
    multisig = await DisputeMultiSig.deploy(
      [arbiter1.address, arbiter2.address, arbiter3.address],
      REQUIRED_VOTES
    );
    await multisig.waitForDeployment();
    await stakeArbiters(multisig, [arbiter1, arbiter2, arbiter3]);

    const TicketBoard = await ethers.getContractFactory("TicketBoard");
    board = await TicketBoard.deploy(await multisig.getAddress());
    await board.waitForDeployment();

    const block = await ethers.provider.getBlock("latest");
    const deadline = block.timestamp + 3 * ONE_DAY;

    const tx = await board
      .connect(company)
      .createTicket(TITLE, DETAILS_CID, deadline, { value: TICKET_VALUE });

    const receipt = await tx.wait();
    const event = receipt.logs.find((l) => l.fragment?.name === "TicketCreated");
    ticketAddr = event.args.escrow;
    ticket = await ethers.getContractAt("TicketEscrow", ticketAddr);
  });

  it("allows any non-company user to claim ticket first", async function () {
    await expect(ticket.connect(worker).claimTicket()).to.not.be.reverted;
  });

  it("prevents double claim", async function () {
    await ticket.connect(worker).claimTicket();

    await expect(ticket.connect(randomUser).claimTicket()).to.be.revertedWith(
      "Ticket not open"
    );
  });

  it("lets worker claim and submit proof", async function () {
    await ticket.connect(worker).claimTicket();

    await expect(
      ticket.connect(worker).submitProof(PROOF_CID, PROOF_NOTE)
    ).to.not.be.reverted;
  });

  it("happy path: company approves submission and pays worker", async function () {
    await ticket.connect(worker).claimTicket();
    await ticket.connect(worker).submitProof(PROOF_CID, PROOF_NOTE);

    await expect(ticket.connect(company).approveSubmission()).to.not.be.reverted;
    expect(await ticket.status()).to.equal(4);
  });

  it("prevents dispute before submission", async function () {
    await ticket.connect(worker).claimTicket();

    await expect(
      ticket.connect(company).disputeByCompany()
    ).to.be.revertedWith("Not submitted");
  });

  it("prevents company dispute before deadline", async function () {
    await ticket.connect(worker).claimTicket();
    await ticket.connect(worker).submitProof(PROOF_CID, PROOF_NOTE);

    const fee = await multisig.disputeFeeForTicket(ticketAddr);
    await expect(
      ticket.connect(company).disputeByCompany({ value: fee })
    ).to.be.revertedWith("Deadline chua het");
  });

  it("lets company dispute after deadline with 1 percent fee", async function () {
    await ticket.connect(worker).claimTicket();
    await ticket.connect(worker).submitProof(PROOF_CID, PROOF_NOTE);

    const fee = await multisig.disputeFeeForTicket(ticketAddr);
    expect(fee).to.equal(TICKET_VALUE / 100n);

    await expect(openCompanyDispute()).to.not.be.reverted;
    expect(await ticket.status()).to.equal(3);
  });

  it("lets worker dispute after deadline with 1 percent fee", async function () {
    await ticket.connect(worker).claimTicket();
    await ticket.connect(worker).submitProof(PROOF_CID, PROOF_NOTE);

    await expect(openWorkerDispute()).to.not.be.reverted;
    expect(await ticket.status()).to.equal(3);
  });

  it("resolves 2 of 3 votes to worker", async function () {
    await ticket.connect(worker).claimTicket();
    await ticket.connect(worker).submitProof(PROOF_CID, PROOF_NOTE);
    await openCompanyDispute();

    await multisig.connect(arbiter1).vote(ticketAddr, true);
    await multisig.connect(arbiter2).vote(ticketAddr, true);

    const [, , resolved] = await multisig.getVotes(ticketAddr);
    expect(resolved).to.equal(true);
    expect(await ticket.status()).to.equal(4);
  });

  it("resolves 2 of 3 votes to company", async function () {
    await ticket.connect(worker).claimTicket();
    await ticket.connect(worker).submitProof(PROOF_CID, PROOF_NOTE);
    await openCompanyDispute();

    await multisig.connect(arbiter1).vote(ticketAddr, false);
    await multisig.connect(arbiter2).vote(ticketAddr, false);

    const [, , resolved] = await multisig.getVotes(ticketAddr);
    expect(resolved).to.equal(true);
    expect(await ticket.status()).to.equal(5);
  });

  it("prevents arbiter from voting twice", async function () {
    await ticket.connect(worker).claimTicket();
    await ticket.connect(worker).submitProof(PROOF_CID, PROOF_NOTE);
    await openCompanyDispute();

    await multisig.connect(arbiter1).vote(ticketAddr, true);

    await expect(
      multisig.connect(arbiter1).vote(ticketAddr, true)
    ).to.be.revertedWith("Already voted");
  });

  it("prevents non-arbiter from voting", async function () {
    await ticket.connect(worker).claimTicket();
    await ticket.connect(worker).submitProof(PROOF_CID, PROOF_NOTE);
    await openCompanyDispute();

    await expect(
      multisig.connect(company).vote(ticketAddr, true)
    ).to.be.revertedWith("Not an arbiter");
  });

  it("prevents voting after dispute resolved", async function () {
    await ticket.connect(worker).claimTicket();
    await ticket.connect(worker).submitProof(PROOF_CID, PROOF_NOTE);
    await openCompanyDispute();

    await multisig.connect(arbiter1).vote(ticketAddr, true);
    await multisig.connect(arbiter2).vote(ticketAddr, true);

    await expect(
      multisig.connect(arbiter3).vote(ticketAddr, true)
    ).to.be.revertedWith("Dispute already resolved");
  });
});
