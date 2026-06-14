const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DisputeMultiSig - Comprehensive Tests", function () {
  let deployer, company, worker, arbiter1, arbiter2, arbiter3, arbiter4, randomUser;
  let board, multisig;
  let ticket, ticketAddr;

  const REQUIRED_VOTES = 2;
  const ONE_DAY = 24 * 60 * 60;
  const TICKET_VALUE = ethers.parseEther("1");
  const TITLE = "Ticket A";
  const DETAILS_CID = "ipfs://ticket-a";
  const PROOF_CID = "ipfs://proof-a";
  const PROOF_NOTE = "Done";

  async function movePastDeadline(instance) {
    const deadline = await instance.deadline();
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(deadline) + 1]);
    await ethers.provider.send("evm_mine", []);
  }

  async function openCompanyDispute(instance, addr, coordinator = multisig) {
    await movePastDeadline(instance);
    const fee = await coordinator.disputeFeeForTicket(addr);
    return instance.connect(company).disputeByCompany({ value: fee });
  }

  async function stakeArbiters(contract, arbiters) {
    const minStake = await contract.minStake();
    for (const arbiter of arbiters) {
      await contract.connect(arbiter).stakeAsArbiter({ value: minStake });
    }
  }

  async function createTicketAndOpenDispute() {
    const block = await ethers.provider.getBlock("latest");
    const deadline = block.timestamp + 3 * ONE_DAY;

    const tx = await board
      .connect(company)
      .createTicket(TITLE, DETAILS_CID, deadline, { value: TICKET_VALUE });

    const receipt = await tx.wait();
    const event = receipt.logs.find((l) => l.fragment?.name === "TicketCreated");
    const addr = event.args.escrow;
    const instance = await ethers.getContractAt("TicketEscrow", addr);

    await instance.connect(worker).claimTicket();
    await instance.connect(worker).submitProof(PROOF_CID, PROOF_NOTE);
    await openCompanyDispute(instance, addr);

    return { addr, instance };
  }

  beforeEach(async function () {
    [deployer, company, worker, arbiter1, arbiter2, arbiter3, arbiter4, randomUser] =
      await ethers.getSigners();
  });

  describe("Deployment", function () {
    it("✅ Deploys with correct arbiters", async function () {
      const DisputeMultiSig = await ethers.getContractFactory("DisputeMultiSig");
      const contract = await DisputeMultiSig.deploy(
        [arbiter1.address, arbiter2.address, arbiter3.address],
        REQUIRED_VOTES
      );
      await contract.waitForDeployment();

      expect(await contract.arbiters(0)).to.equal(arbiter1.address);
      expect(await contract.arbiters(1)).to.equal(arbiter2.address);
      expect(await contract.arbiters(2)).to.equal(arbiter3.address);
    });

    it("✅ Deploys with correct required votes", async function () {
      const DisputeMultiSig = await ethers.getContractFactory("DisputeMultiSig");
      const contract = await DisputeMultiSig.deploy(
        [arbiter1.address, arbiter2.address, arbiter3.address],
        REQUIRED_VOTES
      );
      await contract.waitForDeployment();

      expect(await contract.required()).to.equal(REQUIRED_VOTES);
    });

    it("✅ isArbiter returns true for arbiters", async function () {
      const DisputeMultiSig = await ethers.getContractFactory("DisputeMultiSig");
      const contract = await DisputeMultiSig.deploy(
        [arbiter1.address, arbiter2.address, arbiter3.address],
        REQUIRED_VOTES
      );
      await contract.waitForDeployment();

      expect(await contract.isArbiter(arbiter1.address)).to.equal(true);
      expect(await contract.isArbiter(arbiter2.address)).to.equal(true);
      expect(await contract.isArbiter(arbiter3.address)).to.equal(true);
      expect(await contract.isArbiter(randomUser.address)).to.equal(false);
    });

    it("❌ Cannot deploy with empty arbiters array", async function () {
      const DisputeMultiSig = await ethers.getContractFactory("DisputeMultiSig");
      await expect(DisputeMultiSig.deploy([], 1)).to.be.revertedWith(
        "No arbiters"
      );
    });

    it("❌ Cannot deploy with zero required votes", async function () {
      const DisputeMultiSig = await ethers.getContractFactory("DisputeMultiSig");
      await expect(
        DisputeMultiSig.deploy([arbiter1.address, arbiter2.address], 0)
      ).to.be.revertedWith("Invalid required");
    });

    it("❌ Cannot deploy with required > arbiters count", async function () {
      const DisputeMultiSig = await ethers.getContractFactory("DisputeMultiSig");
      await expect(
        DisputeMultiSig.deploy([arbiter1.address, arbiter2.address], 3)
      ).to.be.revertedWith("Invalid required");
    });

    it("❌ Cannot deploy with duplicate arbiters", async function () {
      const DisputeMultiSig = await ethers.getContractFactory("DisputeMultiSig");
      await expect(
        DisputeMultiSig.deploy(
          [arbiter1.address, arbiter1.address, arbiter2.address],
          2
        )
      ).to.be.revertedWith("Duplicate arbiter");
    });

    it("❌ Cannot deploy with zero address arbiter", async function () {
      const DisputeMultiSig = await ethers.getContractFactory("DisputeMultiSig");
      await expect(
        DisputeMultiSig.deploy(
          [arbiter1.address, ethers.ZeroAddress, arbiter2.address],
          2
        )
      ).to.be.revertedWith("Zero arbiter");
    });
  });

  describe("Staking", function () {
    it("✅ User can stake to become an arbiter", async function () {
      const DisputeMultiSig = await ethers.getContractFactory("DisputeMultiSig");
      const contract = await DisputeMultiSig.deploy(
        [arbiter1.address, arbiter2.address, arbiter3.address],
        REQUIRED_VOTES
      );
      await contract.waitForDeployment();

      const minStake = await contract.minStake();

      await expect(
        contract.connect(randomUser).stakeAsArbiter({ value: minStake })
      )
        .to.emit(contract, "ArbiterStaked")
        .withArgs(randomUser.address, minStake, minStake);

      expect(await contract.isArbiter(randomUser.address)).to.equal(true);
      expect(await contract.stakes(randomUser.address)).to.equal(minStake);
    });

    it("❌ User cannot become arbiter below min stake", async function () {
      const DisputeMultiSig = await ethers.getContractFactory("DisputeMultiSig");
      const contract = await DisputeMultiSig.deploy(
        [arbiter1.address, arbiter2.address, arbiter3.address],
        REQUIRED_VOTES
      );
      await contract.waitForDeployment();

      const minStake = await contract.minStake();

      await expect(
        contract.connect(randomUser).stakeAsArbiter({ value: minStake - 1n })
      ).to.be.revertedWith("Below min stake");
    });

    it("✅ Minority voters are slashed proportionally to stake", async function () {
      const DisputeMultiSig = await ethers.getContractFactory("DisputeMultiSig");
      const contract = await DisputeMultiSig.deploy(
        [arbiter1.address, arbiter2.address, arbiter3.address],
        2
      );
      await contract.waitForDeployment();
      await stakeArbiters(contract, [arbiter1, arbiter2, arbiter3]);

      const TicketBoard = await ethers.getContractFactory("TicketBoard");
      const localBoard = await TicketBoard.deploy(await contract.getAddress());
      await localBoard.waitForDeployment();

      await contract.connect(arbiter1).stakeAsArbiter({
        value: ethers.parseEther("1"),
      });
      const block = await ethers.provider.getBlock("latest");
      const tx = await localBoard
        .connect(company)
        .createTicket(TITLE, DETAILS_CID, block.timestamp + 3 * ONE_DAY, {
          value: TICKET_VALUE,
        });
      const receipt = await tx.wait();
      const event = receipt.logs.find((l) => l.fragment?.name === "TicketCreated");
      const instance = await ethers.getContractAt("TicketEscrow", event.args.escrow);

      await instance.connect(worker).claimTicket();
      await instance.connect(worker).submitProof(PROOF_CID, PROOF_NOTE);
      await openCompanyDispute(instance, event.args.escrow, contract);

      const highStakeBefore = await contract.stakes(arbiter1.address);
      const expectedPenalty = (highStakeBefore * (await contract.slashBps())) / 10000n;

      await contract.connect(arbiter1).vote(event.args.escrow, false);
      await contract.connect(arbiter2).vote(event.args.escrow, true);
      await contract.connect(arbiter3).vote(event.args.escrow, true);

      const highPenalty =
        highStakeBefore - (await contract.stakes(arbiter1.address));

      expect(highPenalty).to.equal(expectedPenalty);
      expect(await contract.penaltyPool()).to.be.lessThan(highPenalty);
    });
  });

  describe("Expertise and Decline", function () {
    it("✅ Only arbiters with matching expertise are eligible", async function () {
      const DisputeMultiSig = await ethers.getContractFactory("DisputeMultiSig");
      const contract = await DisputeMultiSig.deploy(
        [arbiter1.address, arbiter2.address, arbiter3.address, arbiter4.address],
        REQUIRED_VOTES
      );
      await contract.waitForDeployment();
      await stakeArbiters(contract, [arbiter1, arbiter2, arbiter3, arbiter4]);

      await contract.connect(arbiter1).setExpertiseMask(2);
      await contract.connect(arbiter2).setExpertiseMask(2);
      await contract.connect(arbiter3).setExpertiseMask(1);
      await contract.connect(arbiter4).setExpertiseMask(1);

      const TicketBoard = await ethers.getContractFactory("TicketBoard");
      const localBoard = await TicketBoard.deploy(await contract.getAddress());
      await localBoard.waitForDeployment();

      const block = await ethers.provider.getBlock("latest");
      const tx = await localBoard
        .connect(company)
        .createTicketWithCategory(TITLE, DETAILS_CID, block.timestamp + 3 * ONE_DAY, 1, {
          value: TICKET_VALUE,
        });
      const receipt = await tx.wait();
      const event = receipt.logs.find((l) => l.fragment?.name === "TicketCreated");
      const instance = await ethers.getContractAt("TicketEscrow", event.args.escrow);

      await instance.connect(worker).claimTicket();
      await instance.connect(worker).submitProof(PROOF_CID, PROOF_NOTE);
      await movePastDeadline(instance);
      await expect(
        instance.connect(company).disputeByCompany({
          value: await contract.disputeFeeForTicket(event.args.escrow),
        })
      ).to.be.revertedWith(
        "Not enough arbiters"
      );

      await contract.connect(arbiter3).setExpertiseMask(2);
      await expect(
        instance.connect(company).disputeByCompany({
          value: await contract.disputeFeeForTicket(event.args.escrow),
        })
      ).to.emit(
        contract,
        "DisputePanelSelected"
      );
    });

    it("✅ Selected arbiter can decline and be replaced", async function () {
      const DisputeMultiSig = await ethers.getContractFactory("DisputeMultiSig");
      const contract = await DisputeMultiSig.deploy(
        [arbiter1.address, arbiter2.address, arbiter3.address, arbiter4.address],
        REQUIRED_VOTES
      );
      await contract.waitForDeployment();
      await stakeArbiters(contract, [arbiter1, arbiter2, arbiter3, arbiter4]);

      const TicketBoard = await ethers.getContractFactory("TicketBoard");
      const localBoard = await TicketBoard.deploy(await contract.getAddress());
      await localBoard.waitForDeployment();

      const block = await ethers.provider.getBlock("latest");
      const tx = await localBoard
        .connect(company)
        .createTicketWithCategory(TITLE, DETAILS_CID, block.timestamp + 3 * ONE_DAY, 0, {
          value: TICKET_VALUE,
        });
      const receipt = await tx.wait();
      const event = receipt.logs.find((l) => l.fragment?.name === "TicketCreated");
      const instance = await ethers.getContractAt("TicketEscrow", event.args.escrow);

      await instance.connect(worker).claimTicket();
      await instance.connect(worker).submitProof(PROOF_CID, PROOF_NOTE);
      await openCompanyDispute(instance, event.args.escrow, contract);

      const before = await contract.getSelectedArbiters(event.args.escrow);
      const declined = before[0];
      const declineSigner = [arbiter1, arbiter2, arbiter3, arbiter4].find(
        (item) => item.address === declined
      );

      await expect(contract.connect(declineSigner).declineDispute(event.args.escrow))
        .to.emit(contract, "ArbiterDeclined");

      const after = await contract.getSelectedArbiters(event.args.escrow);
      expect(after).to.have.length(3);
      expect(after).to.not.include(declined);
    });
  });

  describe("Voting", function () {
    beforeEach(async function () {
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

      const created = await createTicketAndOpenDispute();
      ticket = created.instance;
      ticketAddr = created.addr;
    });

    it("✅ Arbiter can vote for worker", async function () {
      await expect(multisig.connect(arbiter1).vote(ticketAddr, true)).to.not.be
        .reverted;

      const [forWorker, forCompany, resolved] = await multisig.getVotes(ticketAddr);
      expect(forWorker).to.equal(1);
      expect(forCompany).to.equal(0);
      expect(resolved).to.equal(false);
    });

    it("✅ Arbiter can vote for company", async function () {
      await expect(multisig.connect(arbiter1).vote(ticketAddr, false)).to.not.be
        .reverted;

      const [forWorker, forCompany, resolved] = await multisig.getVotes(ticketAddr);
      expect(forWorker).to.equal(0);
      expect(forCompany).to.equal(1);
      expect(resolved).to.equal(false);
    });

    it("❌ Non-arbiter cannot vote", async function () {
      await expect(
        multisig.connect(randomUser).vote(ticketAddr, true)
      ).to.be.revertedWith("Not an arbiter");
    });

    it("❌ Arbiter cannot vote twice on same ticket", async function () {
      await multisig.connect(arbiter1).vote(ticketAddr, true);

      await expect(
        multisig.connect(arbiter1).vote(ticketAddr, true)
      ).to.be.revertedWith("Already voted");
    });

    it("✅ hasVoted returns correct value", async function () {
      expect(await multisig.hasVoted(ticketAddr, arbiter1.address)).to.equal(false);

      await multisig.connect(arbiter1).vote(ticketAddr, true);

      expect(await multisig.hasVoted(ticketAddr, arbiter1.address)).to.equal(true);
      expect(await multisig.hasVoted(ticketAddr, arbiter2.address)).to.equal(false);
    });

    it("✅ Multiple arbiters can vote", async function () {
      await multisig.connect(arbiter1).vote(ticketAddr, true);
      await multisig.connect(arbiter2).vote(ticketAddr, false);

      const [forWorker, forCompany, resolved] = await multisig.getVotes(ticketAddr);
      expect(forWorker).to.equal(1);
      expect(forCompany).to.equal(1);
      expect(resolved).to.equal(false);
    });
  });

  describe("Resolution", function () {
    beforeEach(async function () {
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

      const created = await createTicketAndOpenDispute();
      ticket = created.instance;
      ticketAddr = created.addr;
    });

    it("✅ Dispute resolves when required votes for worker reached", async function () {
      await multisig.connect(arbiter1).vote(ticketAddr, true);
      await multisig.connect(arbiter2).vote(ticketAddr, true);

      const [forWorker, forCompany, resolved] = await multisig.getVotes(ticketAddr);
      expect(forWorker).to.equal(2);
      expect(forCompany).to.equal(0);
      expect(resolved).to.equal(true);

      expect(await ticket.status()).to.equal(4); // Paid
    });

    it("✅ Dispute resolves when required votes for company reached", async function () {
      await multisig.connect(arbiter1).vote(ticketAddr, false);
      await multisig.connect(arbiter2).vote(ticketAddr, false);

      const [forWorker, forCompany, resolved] = await multisig.getVotes(ticketAddr);
      expect(forWorker).to.equal(0);
      expect(forCompany).to.equal(2);
      expect(resolved).to.equal(true);

      expect(await ticket.status()).to.equal(5); // Refunded
    });

    it("❌ Cannot vote after dispute is resolved", async function () {
      await multisig.connect(arbiter1).vote(ticketAddr, true);
      await multisig.connect(arbiter2).vote(ticketAddr, true);

      await expect(
        multisig.connect(arbiter3).vote(ticketAddr, true)
      ).to.be.revertedWith("Dispute already resolved");
    });

    it("✅ Single vote doesn't resolve dispute", async function () {
      await multisig.connect(arbiter1).vote(ticketAddr, true);

      const [, , resolved] = await multisig.getVotes(ticketAddr);
      expect(resolved).to.equal(false);
    });

    it("✅ Tie doesn't resolve dispute (1-1)", async function () {
      await multisig.connect(arbiter1).vote(ticketAddr, true);
      await multisig.connect(arbiter2).vote(ticketAddr, false);

      const [, , resolved] = await multisig.getVotes(ticketAddr);
      expect(resolved).to.equal(false);
    });

    it("✅ Third vote breaks tie and resolves", async function () {
      await multisig.connect(arbiter1).vote(ticketAddr, true);
      await multisig.connect(arbiter2).vote(ticketAddr, false);
      await multisig.connect(arbiter3).vote(ticketAddr, true);

      const [forWorker, forCompany, resolved] = await multisig.getVotes(ticketAddr);
      expect(forWorker).to.equal(2);
      expect(forCompany).to.equal(1);
      expect(resolved).to.equal(true);
    });
  });

  describe("Multi-Ticket Voting", function () {
    let ticketAddr2;

    beforeEach(async function () {
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

      let created = await createTicketAndOpenDispute();
      ticket = created.instance;
      ticketAddr = created.addr;

      created = await createTicketAndOpenDispute();
      ticketAddr2 = created.addr;
    });

    it("✅ Same arbiter can vote on different tickets", async function () {
      await expect(multisig.connect(arbiter1).vote(ticketAddr, true)).to.not.be
        .reverted;
      await expect(multisig.connect(arbiter1).vote(ticketAddr2, false)).to.not.be
        .reverted;
    });

    it("✅ Votes are tracked separately per ticket", async function () {
      await multisig.connect(arbiter1).vote(ticketAddr, true);
      await multisig.connect(arbiter2).vote(ticketAddr, true);

      await multisig.connect(arbiter1).vote(ticketAddr2, false);

      const [forWorker1, forCompany1, resolved1] = await multisig.getVotes(ticketAddr);
      expect(forWorker1).to.equal(2);
      expect(forCompany1).to.equal(0);
      expect(resolved1).to.equal(true);

      const [forWorker2, forCompany2, resolved2] = await multisig.getVotes(ticketAddr2);
      expect(forWorker2).to.equal(0);
      expect(forCompany2).to.equal(1);
      expect(resolved2).to.equal(false);
    });

    it("✅ hasVoted is tracked separately per ticket", async function () {
      await multisig.connect(arbiter1).vote(ticketAddr, true);

      expect(await multisig.hasVoted(ticketAddr, arbiter1.address)).to.equal(true);
      expect(await multisig.hasVoted(ticketAddr2, arbiter1.address)).to.equal(false);
    });
  });
});
