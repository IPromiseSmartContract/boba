import Web3 from "web3";

const web3 = new Web3();

export const MAX_INT_256: bigint = 2n ** 256n - 1n;
export const NULL_ADDRESS: string =
  "0x0000000000000000000000000000000000000000";
export const ZERO_BYTES32: string =
  "0x0000000000000000000000000000000000000000000000000000000000000000";
export const DEAD_ADDRESS: string =
  "0x000000000000000000000000000000000000dEaD";

export const PROTOCOL_BENEFICIARY: string =
  "0x00000B655d573662B9921e14eDA96DBC9311fDe6"; // a random address for testing
export const MAX_ROYALTY_RANGE: bigint = 5000n; // 50%
const PROTOCOL_CUT: bigint = 2000n; // 20% of the royalty

export function getCreationFee(network: string): bigint {
  const CREATION_FEE: { [key: string]: bigint } = {
    mainnet: 2n * 10n ** 15n, // 0.002 ETH
    optimisticEthereum: 2n * 10n ** 15n, // 0.002 ETH
    arbitrumOne: 2n * 10n ** 15n, // 0.002 ETH
    base: 2n * 10n ** 15n, // 0.002 ETH
    polygon: 5n * 10n ** 18n, // 5 MATIC
    bsc: 15n * 10n ** 15n, // 0.015 BNB
    avalanche: 15n * 10n ** 16n, // 0.15 AVAX
    blast: 2n * 10n ** 15n, // 0.002 ETH
    // Testnets
    sepolia: 0n, // 0 ETH - testnet
    blastSepolia: 0n, // 0 ETH - testnet
    avalancheFujiTestnet: 0n, // 0 ETH - testnet
    movementDevnet: 0n, // 0 MOVE - testnet
  };

  if (CREATION_FEE[network] === undefined) {
    throw new Error(`CREATION_FEE is not defined for ${network}`);
  }

  return CREATION_FEE[network];
}

export function getWETHAddress(network: string): string {
  const WETH_ADDRESS: { [key: string]: string } = {
    mainnet: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
    optimisticEthereum: "0x4200000000000000000000000000000000000006", // WETH
    arbitrumOne: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", // WETH
    base: "0x4200000000000000000000000000000000000006", // WETH
    polygon: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270", // WMATIC
    bsc: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", // WBNB
    avalanche: "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7", // WAVAX
    blast: "0x4300000000000000000000000000000000000004", // WETH
    // Testnets
    sepolia: "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14", // WETH
    blastSepolia: "0x4200000000000000000000000000000000000023", // WETH (yield accumulating)
    avalancheFujiTestnet: "0xd00ae08403B9bbb9124bB305C09058E32C39A48c", // WAVAX
    movementDevnet: "0x4200000000000000000000000000000000000023", // FIXME: WMOVE?
  };
  if (!WETH_ADDRESS[network]) {
    throw new Error(`WETH_ADDRESS is not defined for ${network}`);
  }

  return WETH_ADDRESS[network];
}

export function getMaxSteps(network: string): bigint {
  const MAX_STEPS: { [key: string]: bigint } = {
    mainnet: 1000n, // 30M gas limit
    optimisticEthereum: 1000n, // 30M gas limit
    arbitrumOne: 1000n, // over 30M gas limit
    base: 1000n, // 30M gas limit
    polygon: 1000n, // 30M gas limit
    bsc: 1000n, // 30M gas limit
    avalanche: 1000n, // 15M gas limit
    blast: 1000n, // 30M gas limit
    // Testnets
    sepolia: 1000n, // 30M gas limit
    blastSepolia: 1000n, // 30M gas limit
    avalancheFujiTestnet: 1000n, // ? gas limit
    movementDevnet: 1000n, // ? gas limit
  };
  if (!MAX_STEPS[network]) {
    throw new Error(`MAX_STEPS is not defined for ${network}`);
  }

  return MAX_STEPS[network];
}

export function wei(num: bigint, decimals: number = 18): bigint {
  return BigInt(num) * 10n ** BigInt(decimals);
}

export function modifiedValues<T>(
  object: { [key: string]: T },
  overrides: { [key: string]: T }
): T[] {
  return Object.values({ ...object, ...overrides });
}

// Calculate deterministic address for create2
export function computeCreate2Address(
  saltHex: string,
  implementation: string,
  deployer: string
): string {
  const creationCode = [
    "0x3d602d80600a3d3981f3363d3d373d3d3d363d73",
    implementation.replace(/0x/, "").toLowerCase(),
    "5af43d82803e903d91602b57fd5bf3",
  ].join("");

  return web3.utils.toChecksumAddress(
    `0x${web3.utils
      .sha3(
        `0x${[
          "ff",
          deployer,
          saltHex,
          web3.utils.soliditySha3(creationCode) as string,
        ]
          .map((x) => x.replace(/0x/, ""))
          .join("")}`
      )!
      .slice(-40)}`
  );
}

export function calculateMint(
  tokensToMint: bigint,
  stepPrice: bigint,
  royaltyRatio: bigint,
  tokenDecimals: bigint = 18n
): {
  royalty: bigint;
  creatorCut: bigint;
  protocolCut: bigint;
  reserveToBond: bigint;
  reserveRequired: bigint;
} {
  const reserveToBond = (tokensToMint * stepPrice) / 10n ** tokenDecimals; // assume BASE token has 18 decimals
  const royalty = (reserveToBond * royaltyRatio) / 10000n;
  const protocolCut = (royalty * PROTOCOL_CUT) / 10000n;
  const creatorCut = royalty - protocolCut;
  const reserveRequired = reserveToBond + royalty;

  return { royalty, creatorCut, protocolCut, reserveToBond, reserveRequired };
}

export function calculateBurn(
  tokensToBurn: bigint,
  stepPrice: bigint,
  royaltyRatio: bigint,
  tokenDecimals: bigint = 18n
): {
  royalty: bigint;
  creatorCut: bigint;
  protocolCut: bigint;
  reserveFromBond: bigint;
  reserveToRefund: bigint;
} {
  const reserveFromBond = (tokensToBurn * stepPrice) / 10n ** tokenDecimals; // assume BASE token has 18 decimals
  const royalty = (reserveFromBond * royaltyRatio) / 10000n;
  const protocolCut = (royalty * PROTOCOL_CUT) / 10000n;
  const creatorCut = royalty - protocolCut;
  const reserveToRefund = reserveFromBond - royalty; // after fee -

  return { royalty, creatorCut, protocolCut, reserveFromBond, reserveToRefund };
}

export function calculateRoyalty(
  reserveAmount: bigint,
  royaltyRatio: bigint
): { total: bigint; creatorCut: bigint; protocolCut: bigint } {
  const total = (reserveAmount * royaltyRatio) / 10000n;
  const protocolCut = (total * PROTOCOL_CUT) / 10000n;
  const creatorCut = total - protocolCut;

  return { total, creatorCut, protocolCut };
}
