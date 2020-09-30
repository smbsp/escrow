const { expectRevert, time } = require('@openzeppelin/test-helpers');
const Escrow = artifacts.require('Escrow');

contract('Escrow', (accounts) => {
  let escrow = null;
  const [judge, buyer, seller] = accounts;
  beforeEach(async () => {
      escrow = await Escrow.new(accounts[1], accounts[2], 1000, 100);
  });

  it('Buyer should deposit amount to wallet', async () => {
      await escrow.deposit(5, {from: buyer, value: 1000});
      const escrowBalance = parseInt(await web3.eth.getBalance(escrow.address));
      assert(escrowBalance === 1000);
  });

  it('Should NOT deposit if not sending from buyer', async () => {
    await expectRevert(
      escrow.deposit(5, {from: accounts[5]}),
      'Only buyer'
    );
  });
  
  it('Should NOT deposit if transfer exceed total escrow amount', async () => {
    await expectRevert(
      escrow.deposit(5, {from: buyer, value: 2000}),
      'Cannot deposit more than escrow amount'
    );
  });

  it('Seller should be able to withdraw money', async () => {
    await escrow.deposit(5, {from: buyer, value: 1000});
    await time.increase(5001);
    await escrow.sellerWithdraw({from: seller});
    const escrowBalance = parseInt(await web3.eth.getBalance(escrow.address));
    assert(escrowBalance === 0);
  });

  it('Should NOT withdraw if not sending from seller', async () => {
    await expectRevert(
      escrow.sellerWithdraw({from: accounts[5]}),
      'Only seller'
    );
  });

  it('Should NOT withdraw if contract has no funds', async () => {
    await expectRevert(
      escrow.sellerWithdraw({from: seller}),
      'Need to withdraw full amount'
    );
  });

  it('Should NOT withdraw if within offset', async () => {
    await escrow.deposit(5, {from: buyer, value: 1000});
    await expectRevert(
      escrow.sellerWithdraw({from: seller}),
      'Can only withdraw after offset time'
    );
  });

  it('Should NOT withdraw if dispute is pending', async () => {
    await escrow.deposit(5, {from: buyer, value: 1000});
    await escrow.raiseDispute({from: buyer, value: 100});
    await expectRevert(
      escrow.sellerWithdraw({from: seller}),
      'Can only withdraw if there are no pending disputes'
    );
  });

  it('Buyer should be able to raise dispute within offset', async () => {
    await escrow.deposit(5, {from: buyer, value: 1000});
    await escrow.raiseDispute({from: buyer, value: 100});
    const status = await escrow.isDispute();
    assert(status === true);
  });

  it('Should NOT raise dispute if not sending from buyer', async () => {
    await expectRevert(
      escrow.raiseDispute({from: accounts[5], value: 100}),
      'Only buyer'
    );
  });

  it('Should NOT raise dispute if outside offset', async () => {
    await escrow.deposit(1, {from: buyer, value: 1000});
    await time.increase(1001);
    await expectRevert(
      escrow.raiseDispute({from: buyer, value: 100}),
      'Can only raise dispute or pay dispute fees on or before offset time'
    );
  });

  it('Should NOT raise dispute if fees is less than minimum fee', async () => {
    await escrow.deposit(5, {from: buyer, value: 1000});
    await expectRevert(
      escrow.raiseDispute({from: buyer, value: 99}),
      'Fees must be equal to or greater than the minimum fees'
    );
  });

  it('Seller should be able to pay dispute fee', async () => {
    await escrow.deposit(5, {from: buyer, value: 1000});
    await escrow.senderDisputeFee({from: seller, value: 100});
    const fees = await escrow.senderFeesPaid();
    assert(fees === true);
  });

  it('Should NOT pay dispute fee if not sending from seller', async () => {
    await expectRevert(
      escrow.senderDisputeFee({from: accounts[5], value: 100}),
      'Only seller'
    );
  });

  it('Should NOT pay dispute fee if outside offset', async () => {
    await escrow.deposit(1, {from: buyer, value: 1000});
    await time.increase(1001);
    await expectRevert(
      escrow.senderDisputeFee({from: seller, value: 100}),
      'Can only raise dispute or pay dispute fees on or before offset time'
    );
  });

  it('Should NOT pay dispute fee if fees is less than minimum fee', async () => {
    await escrow.deposit(5, {from: buyer, value: 1000});
    await expectRevert(
      escrow.senderDisputeFee({from: seller, value: 99}),
      'Fees must be equal to or greater than the minimum fees'
    );
  });

  it('Judge should be able to select a winner', async () => {
    await escrow.deposit(5, {from: buyer, value: 1000});
    await escrow.raiseDispute({from: buyer, value: 100});
    const initialRecipientBalance = web3.utils.toBN(
      await web3.eth.getBalance(buyer)
    );
    await escrow.senderDisputeFee({from: seller, value: 100});
    await escrow.decision(accounts[1], {from: judge});
    const finalRecipientBalance = web3.utils.toBN(
      await web3.eth.getBalance(buyer)
    );
    assert(finalRecipientBalance.sub(initialRecipientBalance).toNumber() === 1000);
  });

  it('Buyer should get all the fees and amount if seller does not deposit fees', async () => {
    await escrow.deposit(5, {from: buyer, value: 1000});
    await escrow.raiseDispute({from: buyer, value: 100});
    const initialRecipientBalance = web3.utils.toBN(
      await web3.eth.getBalance(buyer)
    );
    await escrow.decision(accounts[1], {from: judge});
    const finalRecipientBalance = web3.utils.toBN(
      await web3.eth.getBalance(buyer)
    );
    assert(finalRecipientBalance.sub(initialRecipientBalance).toNumber() === 1100);
  });

  it('Should NOT declare winner if not sending from judge', async () => {
    await expectRevert(
      escrow.decision(accounts[1], {from: accounts[5]}),
      'Only judge can declare the winner'
    );
  });

  it('Should NOT payout more than the contract balance', async () => {
    await escrow.deposit(5, {from: buyer, value: 1000});
    await escrow.raiseDispute({from: buyer, value: 100});
    await escrow.senderDisputeFee({from: seller, value: 100});
    escrow.decision(accounts[1], {from: judge});
    await expectRevert(
      escrow.decision(accounts[1], {from: judge}),
      'Cannot spend more than the contract balance'
    );
  });

  it('Should NOT payout more than the contract balance', async () => {
    await escrow.deposit(5, {from: buyer, value: 1000});
    await escrow.raiseDispute({from: buyer, value: 100});
    await escrow.senderDisputeFee({from: seller, value: 100});
    await expectRevert(
      escrow.decision(accounts[5], {from: judge}),
      'Incorrect winner specified'
    );
  });
  
});