import hardhat from "hardhat";
import chai from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";
import { expect } from "chai";
import { FakeContract, smock } from "@defi-wonderland/smock";
import { IERC1155, IERC20, IERC721, TokenRescue } from "../../typechain-types";

chai.use(smock.matchers);

type TestingContext = {
  owner: SignerWithAddress;
  alice: SignerWithAddress;
  bob: SignerWithAddress;
  tokenRescue: TokenRescue;
  erc20: FakeContract<IERC20>;
  erc721: FakeContract<IERC721>;
  erc1155: FakeContract<IERC1155>;
};

const initTestingContext = async (): Promise<TestingContext> => {
  const [owner, alice, bob] = await ethers.getSigners();

  const TokenRescue = await ethers.getContractFactory("TokenRescue");
  const tokenRescue = (await TokenRescue.deploy()) as TokenRescue;

  const erc20 = await smock.fake<IERC20>(
    (
      await hardhat.artifacts.readArtifact(
        "@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20",
      )
    ).abi,
  );
  const erc721 = await smock.fake<IERC721>(
    (
      await hardhat.artifacts.readArtifact("IERC721")
    ).abi,
  );
  const erc1155 = await smock.fake<IERC1155>(
    (
      await hardhat.artifacts.readArtifact("IERC1155")
    ).abi,
  );

  return {
    owner,
    alice,
    bob,
    tokenRescue,
    erc20,
    erc721,
    erc1155,
  };
};

describe("TokenRescue", () => {
  it("should prevent users from calling rescue functions", async () => {
    const { alice, tokenRescue, erc20, erc721, erc1155 } = await loadFixture(
      initTestingContext,
    );
    const expectedErrorMsg = "Ownable: caller is not the owner";

    await expect(
      tokenRescue.connect(alice).rescueERC20(erc20.address, 42),
    ).to.be.revertedWith(expectedErrorMsg);

    await expect(
      tokenRescue.connect(alice).rescueERC721(erc721.address, 42),
    ).to.be.revertedWith(expectedErrorMsg);

    await expect(
      tokenRescue.connect(alice).rescueERC1155(erc1155.address, 42, 1337),
    ).to.be.revertedWith(expectedErrorMsg);

    await expect(
      tokenRescue
        .connect(alice)
        .rescueERC1155Batch(erc1155.address, [42, 24], [1337, 7331]),
    ).to.be.revertedWith(expectedErrorMsg);
  });

  it("should allow owner to rescue ERC20", async () => {
    const { owner, tokenRescue, erc20 } = await loadFixture(initTestingContext);
    erc20.transfer.returns(true);
    await tokenRescue.rescueERC20(erc20.address, 42);
    expect(erc20.transfer).to.be.calledOnceWith(owner.address, 42);
  });

  it("should allow owner to rescue ERC721", async () => {
    const { owner, tokenRescue, erc721 } = await loadFixture(
      initTestingContext,
    );
    erc721["safeTransferFrom(address,address,uint256)"].returns(true);
    await tokenRescue.rescueERC721(erc721.address, 42);
    expect(
      erc721["safeTransferFrom(address,address,uint256)"],
    ).to.be.calledOnceWith(tokenRescue.address, owner.address, 42);
  });

  it("should allow owner to rescue ERC1155", async () => {
    const { owner, tokenRescue, erc1155 } = await loadFixture(
      initTestingContext,
    );
    erc1155.safeTransferFrom.returns(true);
    await tokenRescue.rescueERC1155(erc1155.address, 42, 24);
    expect(erc1155.safeTransferFrom).to.be.calledOnceWith(
      tokenRescue.address,
      owner.address,
      42,
      24,
      "0x",
    );
  });

  it("should allow owner to rescue ERC1155 batch", async () => {
    const { owner, tokenRescue, erc1155 } = await loadFixture(
      initTestingContext,
    );
    erc1155.safeBatchTransferFrom.returns(true);
    await tokenRescue.rescueERC1155Batch(
      erc1155.address,
      [42, 1337],
      [24, 7331],
    );
    expect(erc1155.safeBatchTransferFrom).to.be.calledOnceWith(
      tokenRescue.address,
      owner.address,
      [42, 1337],
      [24, 7331],
      "0x",
    );
  });
});
