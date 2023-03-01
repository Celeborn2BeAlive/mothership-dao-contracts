# Mothership DAO contracts

This is a repository for contracts implementing custom logic for Mothership DAO

## Local setup

Clone the project and install dependencies with:

```bash
pnpm install
```

You can run the tests with:

```bash
pnpm test
```

Take a look at `package.json` for more scripts.

To run hardhat commands:

```bash
pnpm exec hardhat [COMMAND]
```

## Deployment

Deployment and versioning of deployment addresses is implemented with [`hardhat-deploy`](https://github.com/wighawag/hardhat-deploy).

The file `hardhat.config.ts` defines two networks: `deployOptimismGoerli` and `deployOptimism` with the same local RPC URL: http://127.0.0.1:1248

This URL is exposed by Frame wallet, so deployment script will send transactions to it to be signed from and EOA account. It avoids the risk of leaking private keys in files of the repository.
The names of the networks are set to identify deployments tracked by `hardhat-deploy` JSON versionned files.

To deploy to Optimism:

- Install Frame (https://frame.sh/)
- Setup your wallet (best is a new dedicated deployment wallet, or an hardware wallet)
- Choose Optimism network in frame
- Run deployment with `pnpm exec hardhat deploy --network deployOptimism`

You can also deploy to testnet by choosing Optimism Goerli as network and use `deployOptimismGoerli` in the last command.

After deployment, a json file will be created under `./deployments` and contain the deployment address on the chosen network.

The `hardhat-deploy` plugin will not try to redeploy unless contract source code is changed. It will track deployment history in json files.

## Source code upload

To upload the source code to etherscan, you must create an api key on https://optimistic.etherscan.io/. Then create a `.env` file and define the `OPTIMISM_ETHERSCAN_API_KEY` variable inside. You can then run the following command to upload source code:

```bash
pnpm run verify [DEPLOYMENT_ADDR]
```

Note that the api key is used both for Optimism and Optimism Goerli.
