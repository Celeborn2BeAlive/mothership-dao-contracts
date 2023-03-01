import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers } from "hardhat";

const OPTIMISM_CHAIN_ID = 10;
const OPTIMISM_GOERLI_CHAIN_ID = 420;

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const chainId = (await ethers.provider.getNetwork()).chainId;
  if (chainId != OPTIMISM_CHAIN_ID && chainId != OPTIMISM_GOERLI_CHAIN_ID) {
    throw new Error(
      `Can only deploy to Optimism with chainId ${OPTIMISM_CHAIN_ID} or Optimism Goerli with chainId ${OPTIMISM_GOERLI_CHAIN_ID}; detected chainId is ${chainId}`,
    );
  }

  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;

  const { deployer } = await getNamedAccounts();

  await deploy("SortyRevenueDistributor", {
    from: deployer,
    args: [],
    log: true,
  });
};
export default deploy;
