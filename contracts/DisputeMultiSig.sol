// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IFreelanceEscrow {
    function status() external view returns (uint8);

    function company() external view returns (address payable);

    function worker() external view returns (address payable);

    function category() external view returns (uint8);

    function resolveDispute(bool payWorker) external;
}

contract DisputeMultiSig {
    uint8 private constant DISPUTED_STATUS = 3;

    address[] public arbiters;
    mapping(address => bool) public isArbiter;
    mapping(address => uint256) public stakes;
    mapping(address => uint256) public withdrawableStake;
    mapping(address => uint256) public activeAssignments;
    mapping(address => uint256) public expertiseMask;
    mapping(address => uint256) public reputation;

    uint256 public required;
    uint256 public panelSize;
    uint256 public minStake;
    uint256 public slashBps;
    uint256 public penaltyPool;
    uint256 public arbiterFeeBps;

    uint256 private constant ALL_CATEGORIES_MASK = 31;
    uint256 private constant BASE_REPUTATION = 100;
    uint256 private constant MIN_REPUTATION = 10;
    uint256 private constant MAX_REPUTATION = 200;

    struct VoteState {
        uint256 votesForWorker;
        uint256 votesForCompany;
        bool opened;
        bool resolved;
        address[] selectedArbiters;
        mapping(address => bool) isSelected;
        mapping(address => bool) hasVoted;
        mapping(address => bool) votedForWorker;
        mapping(address => bool) declined;
    }

    mapping(address => VoteState) private disputes;

    event ArbiterStaked(address indexed arbiter, uint256 amount, uint256 totalStake);
    event ArbiterUnstaked(address indexed arbiter, uint256 amount);
    event ArbiterSlashed(address indexed ticket, address indexed arbiter, uint256 amount);
    event ArbiterRewarded(address indexed ticket, address indexed arbiter, uint256 amount);
    event ExpertiseUpdated(address indexed arbiter, uint256 expertiseMask);
    event ArbiterDeclined(address indexed ticket, address indexed arbiter, address replacement);
    event DisputePanelSelected(address indexed ticket, address[] arbiters);
    event Voted(address indexed ticket, address indexed arbiter, bool payWorker);
    event Resolved(address indexed ticket, bool payWorker);

    modifier onlyArbiter() {
        require(isArbiter[msg.sender], "Not an arbiter");
        _;
    }

    constructor(address[] memory _arbiters, uint256 _required) {
        require(_arbiters.length > 0, "No arbiters");
        uint256 nextPanelSize = _arbiters.length < 3 ? _arbiters.length : 3;
        require(_required > 0 && _required <= nextPanelSize, "Invalid required");

        required = _required;
        panelSize = nextPanelSize;
        minStake = 0.1 ether;
        slashBps = 1000;
        arbiterFeeBps = 100;

        for (uint256 i = 0; i < _arbiters.length; i++) {
            _addGenesisArbiter(_arbiters[i]);
        }
    }

    function stakeAsArbiter() external payable {
        require(msg.value > 0, "Stake required");

        if (!isArbiter[msg.sender]) {
            require(msg.value >= minStake, "Below min stake");
            arbiters.push(msg.sender);
            isArbiter[msg.sender] = true;
            expertiseMask[msg.sender] = ALL_CATEGORIES_MASK;
            reputation[msg.sender] = BASE_REPUTATION;
        }

        stakes[msg.sender] += msg.value;
        withdrawableStake[msg.sender] += msg.value;

        emit ArbiterStaked(msg.sender, msg.value, stakes[msg.sender]);
    }

    function setExpertiseMask(uint256 mask) external onlyArbiter {
        require(mask > 0 && mask <= ALL_CATEGORIES_MASK, "Invalid expertise");
        expertiseMask[msg.sender] = mask;
        emit ExpertiseUpdated(msg.sender, mask);
    }

    function unstake(uint256 amount) external onlyArbiter {
        require(activeAssignments[msg.sender] == 0, "Active dispute assigned");
        require(amount > 0, "Invalid amount");
        require(withdrawableStake[msg.sender] >= amount, "Insufficient stake");
        require(stakes[msg.sender] >= amount, "Insufficient weight");

        uint256 nextStake = stakes[msg.sender] - amount;
        require(nextStake == 0 || nextStake >= minStake, "Below min stake");

        stakes[msg.sender] = nextStake;
        withdrawableStake[msg.sender] -= amount;

        if (nextStake == 0) {
            isArbiter[msg.sender] = false;
        }

        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        require(ok, "Unstake transfer failed");

        emit ArbiterUnstaked(msg.sender, amount);
    }

    function openDispute(address ticket) external {
        require(msg.sender == ticket, "Only ticket");
        require(IFreelanceEscrow(ticket).status() == DISPUTED_STATUS, "Ticket not disputed");

        VoteState storage v = disputes[ticket];
        require(!v.opened, "Dispute already opened");

        address company = IFreelanceEscrow(ticket).company();
        address worker = IFreelanceEscrow(ticket).worker();
        uint8 category = IFreelanceEscrow(ticket).category();
        uint256 eligible = _eligibleCount(company, worker, category);

        require(eligible >= panelSize, "Not enough arbiters");

        v.opened = true;
        _selectPanel(ticket, company, worker, category);

        emit DisputePanelSelected(ticket, v.selectedArbiters);
    }

    function declineDispute(address ticket) external onlyArbiter {
        VoteState storage v = disputes[ticket];
        require(v.opened, "Dispute not opened");
        require(!v.resolved, "Dispute already resolved");
        require(v.isSelected[msg.sender], "Not selected arbiter");
        require(!v.hasVoted[msg.sender], "Already voted");

        address company = IFreelanceEscrow(ticket).company();
        address worker = IFreelanceEscrow(ticket).worker();
        uint8 category = IFreelanceEscrow(ticket).category();
        uint256 slot = v.selectedArbiters.length;

        for (uint256 i = 0; i < v.selectedArbiters.length; i++) {
            if (v.selectedArbiters[i] == msg.sender) {
                slot = i;
                break;
            }
        }

        require(slot < v.selectedArbiters.length, "Selected arbiter missing");

        v.isSelected[msg.sender] = false;
        v.declined[msg.sender] = true;
        activeAssignments[msg.sender]--;

        address replacement = _selectOne(ticket, company, worker, category, slot + 1000);
        require(replacement != address(0), "No replacement arbiter");

        v.selectedArbiters[slot] = replacement;
        emit ArbiterDeclined(ticket, msg.sender, replacement);
    }

    function vote(address ticket, bool payWorker) external onlyArbiter {
        require(ticket != address(0), "Invalid ticket");

        VoteState storage v = disputes[ticket];

        require(v.opened, "Dispute not opened");
        require(!v.resolved, "Dispute already resolved");
        require(v.isSelected[msg.sender], "Not selected arbiter");
        require(!v.hasVoted[msg.sender], "Already voted");
        require(IFreelanceEscrow(ticket).status() == DISPUTED_STATUS, "Ticket not disputed");

        v.hasVoted[msg.sender] = true;
        v.votedForWorker[msg.sender] = payWorker;

        if (payWorker) {
            v.votesForWorker++;
        } else {
            v.votesForCompany++;
        }

        emit Voted(ticket, msg.sender, payWorker);

        if (v.votesForWorker >= required) {
            _resolve(ticket, true);
        } else if (v.votesForCompany >= required) {
            _resolve(ticket, false);
        }
    }

    function getVotes(
        address ticket
    )
        external
        view
        returns (
            uint256 forWorker,
            uint256 forCompany,
            bool resolved
        )
    {
        VoteState storage v = disputes[ticket];
        return (v.votesForWorker, v.votesForCompany, v.resolved);
    }

    function hasVoted(address ticket, address arbiter) external view returns (bool) {
        return disputes[ticket].hasVoted[arbiter];
    }

    function votedForWorker(address ticket, address arbiter) external view returns (bool) {
        return disputes[ticket].votedForWorker[arbiter];
    }

    function isSelectedArbiter(
        address ticket,
        address arbiter
    ) external view returns (bool) {
        return disputes[ticket].isSelected[arbiter];
    }

    function getSelectedArbiters(address ticket) external view returns (address[] memory) {
        return disputes[ticket].selectedArbiters;
    }

    function getArbiters() external view returns (address[] memory) {
        return arbiters;
    }

    function _addGenesisArbiter(address arbiter) private {
        require(arbiter != address(0), "Zero arbiter");
        require(!isArbiter[arbiter], "Duplicate arbiter");

        arbiters.push(arbiter);
        isArbiter[arbiter] = true;
        stakes[arbiter] = minStake;
        expertiseMask[arbiter] = ALL_CATEGORIES_MASK;
        reputation[arbiter] = BASE_REPUTATION;
    }

    function _selectPanel(address ticket, address company, address worker, uint8 category) private {
        VoteState storage v = disputes[ticket];
        uint256 selectedCount = 0;

        while (selectedCount < panelSize) {
            address selected = _selectOne(ticket, company, worker, category, selectedCount);
            require(selected != address(0), "Not enough arbiters");
            v.selectedArbiters.push(selected);
            selectedCount++;
        }
    }

    function _selectOne(
        address ticket,
        address company,
        address worker,
        uint8 category,
        uint256 salt
    ) private returns (address selected) {
        VoteState storage v = disputes[ticket];
        uint256 totalWeight = _remainingWeight(ticket, company, worker, category);
        if (totalWeight == 0) return address(0);

        uint256 randomWeight = uint256(
            keccak256(
                abi.encodePacked(
                    block.prevrandao,
                    block.timestamp,
                    ticket,
                    salt,
                    arbiters.length
                )
            )
        ) % totalWeight;

        uint256 cursor = 0;
        for (uint256 i = 0; i < arbiters.length; i++) {
            address candidate = arbiters[i];
            if (!_eligible(candidate, company, worker, category)) continue;
            if (v.isSelected[candidate] || v.declined[candidate]) continue;

            cursor += _selectionWeight(candidate);
            if (randomWeight < cursor) {
                v.isSelected[candidate] = true;
                activeAssignments[candidate]++;
                return candidate;
            }
        }
    }

    function _remainingWeight(
        address ticket,
        address company,
        address worker,
        uint8 category
    ) private view returns (uint256 totalWeight) {
        VoteState storage v = disputes[ticket];
        for (uint256 i = 0; i < arbiters.length; i++) {
            address candidate = arbiters[i];
            if (!_eligible(candidate, company, worker, category)) continue;
            if (v.isSelected[candidate] || v.declined[candidate]) continue;
            totalWeight += _selectionWeight(candidate);
        }
    }

    function _eligibleCount(
        address company,
        address worker,
        uint8 category
    ) private view returns (uint256 count) {
        for (uint256 i = 0; i < arbiters.length; i++) {
            if (_eligible(arbiters[i], company, worker, category)) count++;
        }
    }

    function _eligible(
        address candidate,
        address company,
        address worker,
        uint8 category
    ) private view returns (bool) {
        return
            isArbiter[candidate] &&
            stakes[candidate] >= minStake &&
            (expertiseMask[candidate] & (uint256(1) << category)) != 0 &&
            candidate != company &&
            candidate != worker;
    }

    function _selectionWeight(address candidate) private view returns (uint256) {
        uint256 score = reputation[candidate] == 0 ? BASE_REPUTATION : reputation[candidate];
        return (stakes[candidate] * score) / BASE_REPUTATION;
    }

    function _resolve(address ticket, bool payWorker) private {
        VoteState storage v = disputes[ticket];

        v.resolved = true;
        _slashMinority(ticket, payWorker);
        _rewardMajority(ticket, payWorker);

        for (uint256 i = 0; i < v.selectedArbiters.length; i++) {
            activeAssignments[v.selectedArbiters[i]]--;
        }

        IFreelanceEscrow(ticket).resolveDispute(payWorker);
        emit Resolved(ticket, payWorker);
    }

    function _slashMinority(address ticket, bool payWorker) private {
        VoteState storage v = disputes[ticket];

        for (uint256 i = 0; i < v.selectedArbiters.length; i++) {
            address arbiter = v.selectedArbiters[i];
            if (!v.hasVoted[arbiter]) continue;
            if (v.votedForWorker[arbiter] == payWorker) continue;

            uint256 penalty = (stakes[arbiter] * slashBps) / 10_000;
            uint256 backedStake = withdrawableStake[arbiter];
            if (penalty > backedStake) {
                penalty = backedStake;
            }
            if (penalty == 0) {
                _decreaseReputation(arbiter);
                continue;
            }

            stakes[arbiter] -= penalty;
            if (withdrawableStake[arbiter] >= penalty) {
                withdrawableStake[arbiter] -= penalty;
            } else {
                withdrawableStake[arbiter] = 0;
            }

            if (stakes[arbiter] < minStake) {
                isArbiter[arbiter] = false;
            }
            _decreaseReputation(arbiter);

            penaltyPool += penalty;
            emit ArbiterSlashed(ticket, arbiter, penalty);
        }
    }

    function _rewardMajority(address ticket, bool payWorker) private {
        VoteState storage v = disputes[ticket];

        for (uint256 i = 0; i < v.selectedArbiters.length; i++) {
            address arbiter = v.selectedArbiters[i];
            if (!v.hasVoted[arbiter]) continue;
            if (v.votedForWorker[arbiter] != payWorker) continue;

            _increaseReputation(arbiter);
            uint256 reward = (stakes[arbiter] * arbiterFeeBps) / 10_000;
            if (penaltyPool < reward) reward = penaltyPool;
            if (reward == 0) continue;

            penaltyPool -= reward;
            withdrawableStake[arbiter] += reward;
            stakes[arbiter] += reward;
            emit ArbiterRewarded(ticket, arbiter, reward);
        }
    }

    function _increaseReputation(address arbiter) private {
        uint256 current = reputation[arbiter] == 0 ? BASE_REPUTATION : reputation[arbiter];
        reputation[arbiter] = current + 5 > MAX_REPUTATION ? MAX_REPUTATION : current + 5;
    }

    function _decreaseReputation(address arbiter) private {
        uint256 current = reputation[arbiter] == 0 ? BASE_REPUTATION : reputation[arbiter];
        reputation[arbiter] = current > MIN_REPUTATION + 10 ? current - 10 : MIN_REPUTATION;
    }
}
