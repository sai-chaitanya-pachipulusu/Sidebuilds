// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ProjectEscrow {
    struct Transaction {
        address buyer;
        address seller;
        uint256 amount;
        bool released;
        bool disputed;
    }

    mapping(bytes32 => Transaction) public transactions;
    address public platform;
    uint256 public platformFee = 5; // 5%

    event FundsDeposited(bytes32 transactionId, address buyer, uint256 amount);
    event FundsReleased(bytes32 transactionId, address seller, uint256 amount);
    event DisputeRaised(bytes32 transactionId);

    constructor() {
        platform = msg.sender;
    }

    function deposit(bytes32 transactionId, address seller) external payable {
        require(msg.value > 0, "Amount must be greater than 0");
        require(transactions[transactionId].amount == 0, "Transaction already exists");

        transactions[transactionId] = Transaction({
            buyer: msg.sender,
            seller: seller,
            amount: msg.value,
            released: false,
            disputed: false
        });

        emit FundsDeposited(transactionId, msg.sender, msg.value);
    }

    function releaseFunds(bytes32 transactionId) external {
        Transaction storage txn = transactions[transactionId];
        require(msg.sender == txn.buyer || msg.sender == platform, "Unauthorized");
        require(!txn.released, "Funds already released");
        require(!txn.disputed, "Transaction is disputed");

        uint256 platformAmount = (txn.amount * platformFee) / 100;
        uint256 sellerAmount = txn.amount - platformAmount;

        txn.released = true;
        
        payable(platform).transfer(platformAmount);
        payable(txn.seller).transfer(sellerAmount);

        emit FundsReleased(transactionId, txn.seller, sellerAmount);
    }
} 