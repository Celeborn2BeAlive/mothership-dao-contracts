import hardhat from "hardhat";
import chai from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";
import { expect } from "chai";
import { FakeContract, smock } from "@defi-wonderland/smock";
import {
  IERC20Metadata,
  SortyRevenueDistributor,
  TestERC20,
} from "../typechain-types";
import { BigNumber } from "ethers";

chai.use(smock.matchers);

type TestingContext = {
  owner: SignerWithAddress;
  alice: SignerWithAddress;
  bob: SignerWithAddress;
  distributor: SortyRevenueDistributor;
  SORTY: FakeContract<IERC20Metadata>;
  erc20With18Decimals: FakeContract<IERC20Metadata>;
  erc20With6Decimals: FakeContract<IERC20Metadata>;
  erc20With1Decimal: FakeContract<IERC20Metadata>;
};

const sortyHoldings: { [key: string]: BigNumber } = {
  "0xcd4765a5A2A92Fa3f8D97d5e1Ea60b45E544F381":
    ethers.utils.parseEther("218900000"),
  "0xa0DA238B57F3571D0e8AB16151302e6e5eBb851E":
    ethers.utils.parseEther("194487999"),
  "0xb9DB55a7027bBDF9582b9567bFb0c7AC93fb0e59":
    ethers.utils.parseEther("190789902"),
  "0xcDE949273f490561e80Cee357ecF9cfb49e2819B":
    ethers.utils.parseEther("50000000"),
};
const sortyBalanceOf = (address: string) => {
  return sortyHoldings[address];
};

const initTestingContext = async (): Promise<TestingContext> => {
  const [owner, alice, bob] = await ethers.getSigners();

  const SortyRevenueDistributor = await ethers.getContractFactory(
    "SortyRevenueDistributor",
  );
  const distributor =
    (await SortyRevenueDistributor.deploy()) as SortyRevenueDistributor;

  const SORTY = await smock.fake<IERC20Metadata>(
    (
      await hardhat.artifacts.readArtifact("IERC20Metadata")
    ).abi,
    {
      address: "0x41014b9a82cc0ea6bac76f8406bfbec65adc0747",
    },
  );
  SORTY.decimals.returns(18);
  const erc20With18Decimals = await smock.fake<IERC20Metadata>(
    (
      await hardhat.artifacts.readArtifact("IERC20Metadata")
    ).abi,
  );
  erc20With18Decimals.decimals.returns(18);
  erc20With18Decimals.transfer.returns(true);

  const erc20With6Decimals = await smock.fake<IERC20Metadata>(
    (
      await hardhat.artifacts.readArtifact("IERC20Metadata")
    ).abi,
  );
  erc20With6Decimals.decimals.returns(6);
  const erc20With1Decimal = await smock.fake<IERC20Metadata>(
    (
      await hardhat.artifacts.readArtifact("IERC20Metadata")
    ).abi,
  );
  erc20With1Decimal.decimals.returns(0);

  SORTY.balanceOf.returns(sortyBalanceOf);

  await distributor.setHolders(Object.keys(sortyHoldings));

  return {
    owner,
    alice,
    bob,
    distributor,
    SORTY,
    erc20With18Decimals,
    erc20With6Decimals,
    erc20With1Decimal,
  };
};

describe("SortyRevenueDistributor", () => {
  describe("Admin", () => {
    it("setHolders can only be called by owner", async () => {
      const { alice, distributor } = await loadFixture(initTestingContext);
      const expectedErrorMsg = "Ownable: caller is not the owner";

      // Alice cannot set list of holders
      await expect(
        distributor.connect(alice).setHolders([]),
      ).to.be.revertedWith(expectedErrorMsg);

      // Owner can set list of holders
      await distributor.setHolders([]);

      // Alice becomes the new owner
      await distributor.transferOwnership(alice.address);

      // Alice can set list of holders
      await distributor.connect(alice).setHolders([]);

      // Previous owner cannot set the list of holders
      await expect(distributor.setHolders([])).to.be.revertedWith(
        expectedErrorMsg,
      );
    });

    it("when setHolders is called, the list is updated", async () => {
      const { alice, bob, distributor } = await loadFixture(initTestingContext);
      const newHolders = [bob.address, alice.address];
      await distributor.setHolders(newHolders);
      expect(await distributor.holdersLength()).to.equal(newHolders.length);
      expect(await distributor.holders(0)).to.equal(newHolders[0]);
      expect(await distributor.holders(1)).to.equal(newHolders[1]);
    });
  });

  const getExpectedAmounts = async (
    distributor: SortyRevenueDistributor,
    SORTY: FakeContract<IERC20Metadata>,
    amount: BigNumber,
  ): Promise<{ [key: string]: BigNumber }> => {
    const RATE_DIVIDER = await distributor.RATE_DIVIDER();
    const holdersLength = await distributor.holdersLength();
    const weights = {} as { [key: string]: BigNumber };
    let totalWeight = ethers.utils.parseEther("0");
    for (let i = 0; i < holdersLength.toNumber(); ++i) {
      const holder = await distributor.holders(i);
      weights[holder] = await SORTY.balanceOf(holder);
      totalWeight = totalWeight.add(weights[holder]);
    }
    const amounts = {} as { [key: string]: BigNumber };
    for (const [holder, weight] of Object.entries(weights)) {
      amounts[holder] = weights[holder]
        .mul(amount)
        .mul(RATE_DIVIDER)
        .div(totalWeight)
        .div(RATE_DIVIDER);
    }
    return amounts;
  };

  const getTotalSORTYBalanceOfHolders = async (
    distributor: SortyRevenueDistributor,
    SORTY: FakeContract<IERC20Metadata>,
  ): Promise<BigNumber> => {
    let total = ethers.utils.parseEther("0");
    const holdersLength = await distributor.holdersLength();
    for (let i = 0; i < holdersLength.toNumber(); ++i) {
      const holder = await distributor.holders(i);
      total = total.add(await SORTY.balanceOf(holder));
    }
    return total;
  };

  describe("Distribute", () => {
    it("token with 18 decimals is distributed according to shares", async () => {
      const { distributor, SORTY, erc20With18Decimals } = await loadFixture(
        initTestingContext,
      );
      // We will distribute exact same amount of token than SORTY shares
      // We expect each holder with receive the same amount as its amount of SORTY
      const amount = await getTotalSORTYBalanceOfHolders(distributor, SORTY);
      erc20With18Decimals.balanceOf.returns(
        ({ account }: { account: string }) => {
          expect(account).to.equal(distributor.address);
          return amount;
        },
      );
      await distributor.distribute(erc20With18Decimals.address);
      const holdersLength = Object.keys(sortyHoldings).length;
      expect(erc20With18Decimals.transfer).to.have.callCount(holdersLength);
      for (let i = 0; i < holdersLength; ++i) {
        const holder = await distributor.holders(i);
        expect(erc20With18Decimals.transfer.getCall(i).args[0]).to.equal(
          holder,
        );
        expect(erc20With18Decimals.transfer.getCall(i).args[1]).to.equal(
          await SORTY.balanceOf(holder),
        );
      }

      erc20With18Decimals.balanceOf.reset();
      erc20With18Decimals.transfer.reset();
    });
    it("token with 6 decimals is distributed according to shares", async () => {
      const { distributor, SORTY, erc20With6Decimals } = await loadFixture(
        initTestingContext,
      );
      const amount = ethers.utils.parseUnits("4578.25", 6);
      erc20With6Decimals.balanceOf.returns(
        ({ account }: { account: string }) => {
          expect(account).to.equal(distributor.address);
          return amount;
        },
      );
      const expectedAmounts = await getExpectedAmounts(
        distributor,
        SORTY,
        amount,
      );

      await distributor.distribute(erc20With6Decimals.address);
      const holdersLength = Object.keys(sortyHoldings).length;
      expect(erc20With6Decimals.transfer).to.have.callCount(holdersLength);
      for (let i = 0; i < holdersLength; ++i) {
        const holder = await distributor.holders(i);
        expect(erc20With6Decimals.transfer.getCall(i).args[0]).to.equal(holder);
        expect(erc20With6Decimals.transfer.getCall(i).args[1]).to.equal(
          expectedAmounts[holder],
        );
      }

      erc20With6Decimals.balanceOf.reset();
      erc20With6Decimals.transfer.reset();
    });
    it("token with 0 decimals is distributed according to shares", async () => {
      const { distributor, SORTY, erc20With1Decimal } = await loadFixture(
        initTestingContext,
      );
      const amount = ethers.utils.parseUnits("12", 0);
      erc20With1Decimal.balanceOf.returns(
        ({ account }: { account: string }) => {
          expect(account).to.equal(distributor.address);
          return amount;
        },
      );
      const expectedAmounts = await getExpectedAmounts(
        distributor,
        SORTY,
        amount,
      );

      await distributor.distribute(erc20With1Decimal.address);
      const holdersLength = Object.keys(sortyHoldings).length;
      expect(erc20With1Decimal.transfer).to.have.callCount(holdersLength);
      for (let i = 0; i < holdersLength; ++i) {
        const holder = await distributor.holders(i);
        expect(erc20With1Decimal.transfer.getCall(i).args[0]).to.equal(holder);
        expect(erc20With1Decimal.transfer.getCall(i).args[1]).to.equal(
          expectedAmounts[holder],
        );
      }

      erc20With1Decimal.balanceOf.reset();
      erc20With1Decimal.transfer.reset();
    });
    it("SORTY can be distributed and change of balance does not affect weights", async () => {
      const { distributor, SORTY } = await loadFixture(initTestingContext);
      const amount = ethers.utils.parseUnits("128.64", 18);
      SORTY.balanceOf.returns(({ account }: { account: string }) => {
        if (account == distributor.address) {
          return amount;
        }
        return sortyBalanceOf(account);
      });
      const expectedAmounts = await getExpectedAmounts(
        distributor,
        SORTY,
        amount,
      );

      await distributor.distribute(SORTY.address);
      const holdersLength = Object.keys(sortyHoldings).length;
      expect(SORTY.transfer).to.have.callCount(holdersLength);
      for (let i = 0; i < holdersLength; ++i) {
        const holder = await distributor.holders(i);
        expect(SORTY.transfer.getCall(i).args[0]).to.equal(holder);
        expect(SORTY.transfer.getCall(i).args[1]).to.equal(
          expectedAmounts[holder],
        );
      }

      SORTY.balanceOf.returns(sortyBalanceOf);
      SORTY.transfer.reset();
    });
    it("low shares are handled", async () => {
      const { distributor, SORTY, erc20With6Decimals } = await loadFixture(
        initTestingContext,
      );
      const amount = ethers.utils.parseUnits("4578.25", 6);
      erc20With6Decimals.balanceOf.returns(
        ({ account }: { account: string }) => {
          expect(account).to.equal(distributor.address);
          return amount;
        },
      );
      SORTY.balanceOf.returns(({ account }: { account: string }) => {
        if (account == Object.keys(sortyHoldings)[0]) {
          return 1;
        }
        return sortyBalanceOf(account);
      });
      const expectedAmounts = await getExpectedAmounts(
        distributor,
        SORTY,
        amount,
      );

      await distributor.distribute(erc20With6Decimals.address);
      const holdersLength = Object.keys(sortyHoldings).length;
      expect(erc20With6Decimals.transfer).to.have.callCount(holdersLength);
      for (let i = 0; i < holdersLength; ++i) {
        const holder = await distributor.holders(i);
        expect(erc20With6Decimals.transfer.getCall(i).args[0]).to.equal(holder);
        expect(erc20With6Decimals.transfer.getCall(i).args[1]).to.equal(
          expectedAmounts[holder],
        );
      }

      SORTY.balanceOf.returns(sortyBalanceOf);
      erc20With6Decimals.balanceOf.reset();
      erc20With6Decimals.transfer.reset();
    });
    it("one holder can have zero share", async () => {
      const { distributor, SORTY, erc20With6Decimals } = await loadFixture(
        initTestingContext,
      );
      const amount = ethers.utils.parseUnits("4578.25", 6);
      erc20With6Decimals.balanceOf.returns(
        ({ account }: { account: string }) => {
          expect(account).to.equal(distributor.address);
          return amount;
        },
      );
      SORTY.balanceOf.returns(({ account }: { account: string }) => {
        if (account == Object.keys(sortyHoldings)[0]) {
          return 0;
        }
        return sortyBalanceOf(account);
      });
      const expectedAmounts = await getExpectedAmounts(
        distributor,
        SORTY,
        amount,
      );

      await distributor.distribute(erc20With6Decimals.address);
      const holdersLength = Object.keys(sortyHoldings).length;
      expect(erc20With6Decimals.transfer).to.have.callCount(holdersLength);
      for (let i = 0; i < holdersLength; ++i) {
        const holder = await distributor.holders(i);
        expect(erc20With6Decimals.transfer.getCall(i).args[0]).to.equal(holder);
        expect(erc20With6Decimals.transfer.getCall(i).args[1]).to.equal(
          expectedAmounts[holder],
        );
      }

      SORTY.balanceOf.returns(sortyBalanceOf);
      erc20With6Decimals.balanceOf.reset();
      erc20With6Decimals.transfer.reset();
    });
    it("one holder can have all shares", async () => {
      const { distributor, SORTY, erc20With6Decimals } = await loadFixture(
        initTestingContext,
      );
      const amount = ethers.utils.parseUnits("4578.25", 6);
      erc20With6Decimals.balanceOf.returns(
        ({ account }: { account: string }) => {
          expect(account).to.equal(distributor.address);
          return amount;
        },
      );
      SORTY.balanceOf.returns(({ account }: { account: string }) => {
        if (account == Object.keys(sortyHoldings)[0]) {
          return 1;
        }
        return 0;
      });
      const expectedAmounts = await getExpectedAmounts(
        distributor,
        SORTY,
        amount,
      );

      await distributor.distribute(erc20With6Decimals.address);
      const holdersLength = Object.keys(sortyHoldings).length;
      expect(erc20With6Decimals.transfer).to.have.callCount(holdersLength);
      for (let i = 0; i < holdersLength; ++i) {
        const holder = await distributor.holders(i);
        expect(erc20With6Decimals.transfer.getCall(i).args[0]).to.equal(holder);
        expect(erc20With6Decimals.transfer.getCall(i).args[1]).to.equal(
          expectedAmounts[holder],
        );

        if (holder == Object.keys(sortyHoldings)[0]) {
          expect(expectedAmounts[holder]).to.equal(amount);
        }
      }

      SORTY.balanceOf.returns(sortyBalanceOf);
      erc20With6Decimals.balanceOf.reset();
      erc20With6Decimals.transfer.reset();
    });
  });

  describe("Deposit and distribute", () => {
    it("distribute tokens after deposit", async () => {
      const { distributor, SORTY } = await loadFixture(initTestingContext);

      const TestERC20 = await ethers.getContractFactory("TestERC20");
      const testErc20 = (await TestERC20.deploy(
        "Test",
        "Test",
        0,
        18,
      )) as TestERC20;

      // We will distribute exact same amount of token than SORTY shares
      // We expect each holder with receive the same amount as its amount of SORTY
      const amount = await getTotalSORTYBalanceOfHolders(distributor, SORTY);

      await testErc20.mint(amount);

      await testErc20.approve(distributor.address, amount);
      await distributor.depositAndDistribute(testErc20.address, amount);

      expect(await testErc20.balanceOf(distributor.address)).to.equal(0);

      const holdersLength = Object.keys(sortyHoldings).length;
      for (let i = 0; i < holdersLength; ++i) {
        const holder = await distributor.holders(i);
        const balance = await testErc20.balanceOf(holder);

        expect(balance).to.equal(await SORTY.balanceOf(holder));
      }
    });

    it("revert if balance is not 0 before deposit", async () => {
      const { distributor } = await loadFixture(initTestingContext);

      const TestERC20 = await ethers.getContractFactory("TestERC20");
      const testErc20 = (await TestERC20.deploy(
        "Test",
        "Test",
        1_000_000,
        18,
      )) as TestERC20;

      await testErc20.transfer(distributor.address, 1_000);
      expect(
        distributor.depositAndDistribute(testErc20.address, 10),
      ).to.be.revertedWith(
        "depositAndDistribute: initial balance of token should be 0",
      );
    });
  });
});
