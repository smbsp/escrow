// SPDX-License-Identifier: MIT
pragma solidity ^0.7.1;

contract Escrow {
    address payable judge;
    address payable buyer;
    address payable seller;
    address payable winner;
    uint amount;
    uint judgeMinFees;
    uint totalFees;
    uint offset;
    bool public sellerFeesPaid;
    bool public isDispute;
    bool isDecided;
    
    constructor (address payable _buyer, address payable _seller, uint _amount, uint _judgeMinFees) {
        judge = msg.sender;
        buyer = _buyer;
        seller = _seller;
        amount = _amount;
        judgeMinFees = _judgeMinFees;
        winner = buyer;
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
        require(address(this).balance == amount, 'Cannot deposit more or less than escrow amount');
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
    
    function sellerDisputeFee() payable external onlySeller() allowedOffset() allowedFees(msg.value) {
        require(isDispute == true, 'No disputes raised');
        uint sellerFees = msg.value;
        sellerFeesPaid = true;
        totalFees += sellerFees;
    }
    
    function decision(address payable _winner) external {
        require(msg.sender == judge, 'Only judge can declare the winner');
        require(_winner == buyer || _winner == seller, 'Incorrect winner specified');
        winner = _winner;
        isDecided = true;
        if (isDispute == true && sellerFeesPaid == true) {
            judge.transfer(totalFees);
        }
    }
    
    function disputeWinnerWithdrawl() external {
        require(msg.sender == winner, 'Funds are withdrawable only by winner');
        if (sellerFeesPaid == false) {
            buyer.transfer(totalFees + amount);
        } else {
            if (isDispute == true && isDecided == true) {
                winner.transfer(amount);
            } else {
                revert('Decision pending from judge');
            }
        }
    }
    
    function balanceOf() view external returns(uint) {
        return address(this).balance;
    }
    
}