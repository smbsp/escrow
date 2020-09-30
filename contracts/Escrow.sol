// SPDX-License-Identifier: MIT
pragma solidity ^0.7.1;

contract Escrow {
    address payable public judge;
    address payable public buyer;
    address payable public seller;
    uint public amount;
    uint public judgeMinFees;
    uint public totalFees;
    uint offset;
    bool public senderFeesPaid;
    bool public isDispute;
    
    constructor (address payable _buyer, address payable _seller, uint _amount, uint _judgeMinFees) {
        judge = msg.sender;
        buyer = _buyer;
        seller = _seller;
        amount = _amount;
        judgeMinFees = _judgeMinFees;
    }
    
    modifier onlyBuyer() {
        require(msg.sender == buyer,'Only buyer');
        _;
    }
    
    modifier onlySeller() {
        require(msg.sender == seller,'Only seller');
        _;
    }
    
    modifier allowedOffset() {
        require(block.timestamp <= offset, 'Can only raise dispute or pay dispute fees on or before offset time');
        _;
    }
    
    modifier allowedFees(uint fee) {
        require(fee >= judgeMinFees, 'Fees must be equal to or greater than the minimum fees');
        _;
    }
    
    function deposit(uint time) payable external onlyBuyer() {
        require(address(this).balance <= amount, 'Cannot deposit more than escrow amount');
        offset = block.timestamp + time;
    }
    
    function sellerWithdraw() external onlySeller() {
        require(isDispute == false, 'Can only withdraw if there are no pending disputes');
        require(address(this).balance == amount, 'Need to withdraw full amount');
        require(block.timestamp > offset, 'Can only withdraw after offset time');
        seller.transfer(amount);
    }
    
    function raiseDispute() payable external onlyBuyer() allowedOffset() allowedFees(msg.value) {
       uint buyerFee = msg.value;
       totalFees += buyerFee;
       isDispute = true;
    }
    
    function senderDisputeFee() payable external onlySeller() allowedOffset() allowedFees(msg.value) {
        uint senderFees = msg.value;
        senderFeesPaid = true;
        totalFees += senderFees;
    }
    
    function decision(address payable winner) external {
        require(msg.sender == judge, 'Only judge can declare the winner');
        require(address(this).balance >= totalFees + amount, 'Cannot spend more than the contract balance');
        require(winner == buyer || winner == seller, 'Incorrect winner specified');
        if (senderFeesPaid == false) {
            buyer.transfer(totalFees + amount);
        }
        if (isDispute == true && senderFeesPaid == true) {
            winner.transfer(amount);
            judge.transfer(totalFees);
        }
    }
    
    function balanceOf() view external returns(uint) {
        return address(this).balance;
    }
    
}