// SPDX-License-Identifier: MIT
pragma solidity 0.8.36;

/// @title TrackAidLedger
/// @notice Append-only audit anchors for off-chain disaster-relief records.
/// @dev This contract is not a token and never receives or transfers funds.
contract TrackAidLedger {
    enum RecordKind {
        Donation,
        Disbursement,
        Confirmation,
        CampaignApproval
    }

    error Unauthorized();
    error ZeroAddress();
    error RecordAlreadyAnchored(bytes32 recordId);

    event RecordAnchored(
        bytes32 indexed recordId,
        bytes32 indexed campaignIdHash,
        RecordKind indexed kind,
        uint256 amountCentavos,
        bytes32 payloadHash,
        address recorder,
        uint256 recordedAt
    );
    event RecorderTransferStarted(address indexed currentRecorder, address indexed pendingRecorder);
    event RecorderTransferred(address indexed previousRecorder, address indexed newRecorder);
    event OwnershipTransferStarted(address indexed currentOwner, address indexed pendingOwner);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    address public owner;
    address public pendingOwner;
    address public recorder;
    address public pendingRecorder;

    mapping(bytes32 recordId => bool anchored) public isAnchored;

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    modifier onlyRecorder() {
        if (msg.sender != recorder) revert Unauthorized();
        _;
    }

    constructor(address initialOwner, address initialRecorder) {
        if (initialOwner == address(0) || initialRecorder == address(0)) revert ZeroAddress();
        owner = initialOwner;
        recorder = initialRecorder;
        emit OwnershipTransferred(address(0), initialOwner);
        emit RecorderTransferred(address(0), initialRecorder);
    }

    function anchorRecord(
        bytes32 recordId,
        bytes32 campaignIdHash,
        RecordKind kind,
        uint256 amountCentavos,
        bytes32 payloadHash
    ) external onlyRecorder {
        if (isAnchored[recordId]) revert RecordAlreadyAnchored(recordId);
        isAnchored[recordId] = true;

        emit RecordAnchored(
            recordId,
            campaignIdHash,
            kind,
            amountCentavos,
            payloadHash,
            msg.sender,
            block.timestamp
        );
    }

    function beginRecorderTransfer(address nextRecorder) external onlyOwner {
        if (nextRecorder == address(0)) revert ZeroAddress();
        pendingRecorder = nextRecorder;
        emit RecorderTransferStarted(recorder, nextRecorder);
    }

    function acceptRecorderRole() external {
        if (msg.sender != pendingRecorder) revert Unauthorized();
        address previousRecorder = recorder;
        recorder = msg.sender;
        pendingRecorder = address(0);
        emit RecorderTransferred(previousRecorder, msg.sender);
    }

    function beginOwnershipTransfer(address nextOwner) external onlyOwner {
        if (nextOwner == address(0)) revert ZeroAddress();
        pendingOwner = nextOwner;
        emit OwnershipTransferStarted(owner, nextOwner);
    }

    function acceptOwnership() external {
        if (msg.sender != pendingOwner) revert Unauthorized();
        address previousOwner = owner;
        owner = msg.sender;
        pendingOwner = address(0);
        emit OwnershipTransferred(previousOwner, msg.sender);
    }
}
