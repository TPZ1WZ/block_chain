// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IEscrowFactory {
    function onTicketClaim(address worker) external;
}

interface IDisputeCoordinator {
    function openDispute(address ticket) external payable;
    function progressRound(address ticket) external;
}

interface IParticipantRules {
    function isParticipantBanned(address participant) external view returns (bool);
}

contract TicketEscrow {
    /* =====================================================
                            STORAGE
       =====================================================*/

    address public factory;

    address payable public company;
    address payable public worker;

    uint256 public amount;
    uint256 public deadline;
    uint256 public createdAt;
    uint256 public claimedAt;
    uint256 public submittedAt;
    uint256 public approvedAt;
    uint256 public disputeOpenedAt;
    uint256 public resubmissionCount;

    uint256 public constant MAX_RESUBMISSION_REQUESTS = 3;
    uint256 public constant MIN_RESUBMISSION_WINDOW = 1 days;

    /// @notice DisputeMultiSig contract
    address public arbiter;

    /// @notice Ticket metadata
    string public title;
    string public detailsCID;
    uint8 public category;

    /// @notice Submission data
    string public proofCID;
    string public proofNote;
    string public rejectionReason;

    enum Status {
        Open,
        Claimed,
        Submitted,
        Disputed,
        Paid,
        Refunded,
        Cancelled
    }

    Status public status;

    /* =====================================================
                            EVENTS
       =====================================================*/

    event TicketClaimed(address indexed worker, uint256 claimedAt);
    event ProofSubmitted(
        address indexed worker,
        string proofCID,
        string proofNote,
        uint256 submittedAt
    );
    event SubmissionRejected(
        string reason,
        uint256 timestamp,
        uint256 newDeadline,
        uint256 resubmissionCount
    );
    event DisputeOpened(address indexed openedBy);
    event Paid(address indexed worker, uint256 amount);
    event Refunded(address indexed company, uint256 amount);
    event TicketCancelled(address indexed company, uint256 amount);

    /* =====================================================
                            MODIFIERS
       =====================================================*/

    modifier onlyFactory() {
        require(msg.sender == factory, "Only factory");
        _;
    }

    modifier onlyCompany() {
        require(msg.sender == company, "Not company");
        _;
    }

    modifier onlyWorker() {
        require(msg.sender == worker, "Not worker");
        _;
    }

    modifier onlyArbiter() {
        require(msg.sender == arbiter, "Not arbiter");
        _;
    }

    /* =====================================================
                            CONSTRUCTOR
       =====================================================*/

    constructor() {
        factory = msg.sender;
    }

    /* =====================================================
                        INITIALIZATION
       =====================================================*/

    function init(
        address _company,
        uint256 _deadline,
        string calldata _title,
        string calldata _detailsCID
    ) external payable onlyFactory {
        _init(_company, _deadline, _title, _detailsCID, 0);
    }

    function init(
        address _company,
        uint256 _deadline,
        string calldata _title,
        string calldata _detailsCID,
        uint8 _category
    ) external payable onlyFactory {
        _init(_company, _deadline, _title, _detailsCID, _category);
    }

    function _init(
        address _company,
        uint256 _deadline,
        string calldata _title,
        string calldata _detailsCID,
        uint8 _category
    ) internal {
        require(company == address(0), "Already initialized");
        require(_company != address(0), "Invalid company");
        require(_deadline > block.timestamp, "Invalid deadline");
        require(msg.value > 0, "Amount must be > 0");
        require(bytes(_title).length > 0, "Title required");

        company = payable(_company);
        amount = msg.value;
        deadline = _deadline;
        title = _title;
        detailsCID = _detailsCID;
        category = _category;
        createdAt = block.timestamp;
        status = Status.Open;
    }

    /* =====================================================
                            SETUP
       =====================================================*/

    function setArbiter(address _arbiter) external onlyFactory {
        require(arbiter == address(0), "Arbiter already set");
        require(_arbiter != address(0), "Invalid arbiter");

        arbiter = _arbiter;
    }

    /* =====================================================
                        WORKER FLOW
       =====================================================*/

    function claimTicket() external {
        require(status == Status.Open, "Ticket not open");
        require(worker == address(0), "Already claimed");
        require(msg.sender != company, "Company cannot claim");
        require(!IParticipantRules(arbiter).isParticipantBanned(msg.sender), "Worker banned");

        worker = payable(msg.sender);
        claimedAt = block.timestamp;
        status = Status.Claimed;

        IEscrowFactory(factory).onTicketClaim(msg.sender);

        emit TicketClaimed(msg.sender, claimedAt);
    }

    function submitProof(
        string calldata _proofCID,
        string calldata _proofNote
    ) external onlyWorker {
        require(status == Status.Claimed, "Invalid state");
        require(block.timestamp <= deadline, "Deadline da qua");
        require(bytes(_proofCID).length > 0, "Proof CID required");

        proofCID = _proofCID;
        proofNote = _proofNote;
        rejectionReason = "";
        submittedAt = block.timestamp;
        status = Status.Submitted;

        emit ProofSubmitted(msg.sender, _proofCID, _proofNote, submittedAt);
    }

    /* =====================================================
                        COMPANY FLOW
       =====================================================*/

    function approveSubmission() external onlyCompany {
        require(status == Status.Submitted, "Not submitted");

        status = Status.Paid;
        approvedAt = block.timestamp;

        uint256 payout = _payWorker();
        emit Paid(worker, payout);
    }

    /// @notice Công ty yêu cầu cộng tác viên làm lại / nộp lại minh chứng
    function requestResubmission(
        string calldata reason
    ) external onlyCompany {
        require(status == Status.Submitted, "Not submitted");
        require(block.timestamp <= deadline, "Deadline da qua");
        require(bytes(reason).length > 0, "Reason required");
        require(resubmissionCount < MAX_RESUBMISSION_REQUESTS, "Resubmission limit reached");

        resubmissionCount += 1;

        uint256 minimumDeadline = block.timestamp + MIN_RESUBMISSION_WINDOW;
        if (deadline < minimumDeadline) {
            deadline = minimumDeadline;
        }

        rejectionReason = reason;
        proofCID = "";
        proofNote = "";
        submittedAt = 0;
        status = Status.Claimed;

        emit SubmissionRejected(reason, block.timestamp, deadline, resubmissionCount);
    }

    /// @notice Công ty hủy ticket khi chưa có ai nhận
    function cancelOpenTicket() external onlyCompany {
        require(status == Status.Open, "Cannot cancel");

        status = Status.Cancelled;

        uint256 refund = _refundCompany();
        emit TicketCancelled(company, refund);
    }

    /// @notice Công ty lấy lại ETH khi worker đã claim nhưng không nộp proof sau deadline
    function reclaimAbandonedTicket() external onlyCompany {
        require(status == Status.Claimed, "Not claimed");
        require(block.timestamp > deadline, "Deadline chua het");

        status = Status.Refunded;

        uint256 refund = _refundCompany();
        emit Refunded(company, refund);
    }

    /// @notice Công ty mở tranh chấp sau khi worker đã submit — chỉ được sau deadline
    function disputeByCompany() external payable onlyCompany {
        require(status == Status.Submitted, "Not submitted");
        require(block.timestamp > deadline, "Deadline chua het");

        status = Status.Disputed;
        disputeOpenedAt = block.timestamp;
        IDisputeCoordinator(arbiter).openDispute{value: msg.value}(address(this));
        emit DisputeOpened(msg.sender);
    }

    /* =====================================================
                        WORKER DISPUTE
       =====================================================*/

    /// @notice Worker có thể mở dispute nếu đã submit nhưng công ty không phản hồi sau deadline
    function disputeByWorker() external payable onlyWorker {
        require(status == Status.Submitted, "Not submitted");
        require(block.timestamp > deadline, "Deadline not passed");

        status = Status.Disputed;
        disputeOpenedAt = block.timestamp;
        IDisputeCoordinator(arbiter).openDispute{value: msg.value}(address(this));
        emit DisputeOpened(msg.sender);
    }

    /// @notice Bất kỳ ai cũng có thể gọi sau khi round deadline qua
    /// Slash arbiter lười → thay thế → gia hạn, hoặc auto-resolve nếu hết vòng
    function progressDisputeRound() external {
        require(status == Status.Disputed, "Not disputed");
        require(disputeOpenedAt > 0, "Dispute not opened");
        IDisputeCoordinator(arbiter).progressRound(address(this));
    }

    /* =====================================================
                    DISPUTE RESOLUTION
       =====================================================*/

    function resolveDispute(bool payWorker_) external onlyArbiter {
        require(status == Status.Disputed, "No dispute");

        if (payWorker_) {
            status = Status.Paid;
            approvedAt = block.timestamp;

            uint256 payout = _payWorker();
            emit Paid(worker, payout);
        } else {
            status = Status.Refunded;

            uint256 refund = _refundCompany();
            emit Refunded(company, refund);
        }
    }

    /* =====================================================
                        INTERNAL PAYMENTS
       =====================================================*/

    function _payWorker() internal returns (uint256 payout) {
        payout = amount;
        amount = 0;

        (bool ok, ) = worker.call{value: payout}("");
        require(ok, "Transfer failed");
    }

    function _refundCompany() internal returns (uint256 refund) {
        refund = amount;
        amount = 0;

        (bool ok, ) = company.call{value: refund}("");
        require(ok, "Transfer failed");
    }
}
