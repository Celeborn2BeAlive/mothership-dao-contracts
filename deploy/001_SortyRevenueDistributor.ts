import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers } from "hardhat";

// For safety checks:
const networks = {
  deployOptimismGoerli: {
    chainId: 420,
    name: "optimism-goerli",
  },
  deployOptimism: {
    chainId: 10,
    name: "optimism",
  },
} as { [key: string]: { [key: string]: any } };

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const network = await ethers.provider.getNetwork();
  if (!(hre.network.name in networks)) {
    console.error(
      `Cannot deploy to network '${hre.network.name}'. Only 'deployOptimism' and 'deployOptimismGoerli' are supported.`,
    );
    process.exit(1);
  }

  const currentNetworkInfo = {
    chainId: network.chainId,
    name: network.name,
  };
  const expectedNetworkInfo = networks[hre.network.name];

  if (
    currentNetworkInfo.chainId != expectedNetworkInfo.chainId ||
    currentNetworkInfo.name != expectedNetworkInfo.name
  ) {
    console.log(
      `Wrong network detected to deploy to ${
        hre.network.name
      }, expected ${JSON.stringify(expectedNetworkInfo)}, got ${JSON.stringify(
        currentNetworkInfo,
      )}. Please connect to the correct network and set the good target on command line.`,
    );
    process.exit(1);
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
