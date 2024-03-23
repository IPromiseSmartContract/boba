import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { MaxUint256, toBigInt } from "ethers";
import {
  MAX_INT_256,
  NULL_ADDRESS,
  PROTOCOL_BENEFICIARY,
  MAX_ROYALTY_RANGE,
  getMaxSteps,
  wei,
  modifiedValues,
  computeCreate2Address,
  calculateMint,
  calculateBurn,
  calculateRoyalty,
  getWETHAddress,
} from "./utils/test-utils";
import {
  BobaToken,
  BobaFactory,
  BobaToken__factory,
  BobaFactory__factory,
  MCV2_Bond,
  MCV2_Token,
  MCV2_ZapV1,
  MCV2_Bond__factory,
} from "../typechain-types";
import { Signer, ZeroAddress } from "ethers";
import { eth } from "web3";

const ZAP = "0x1Bf3183acc57571BecAea0E238d6C3A4d00633da";

function makeid(length: number) {
  let result = "";
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const charactersLength = characters.length;
  let counter = 0;
  while (counter < length) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
    counter += 1;
  }
  return result;
}

let BABY_TOKEN = {
  tokenParams: { name: "Baby Token", symbol: "ETHTAIPEI888" },
  bondParams: {
    mintRoyalty: 30n, // 1%
    burnRoyalty: 30n, // 1.5%
    reserveToken: "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14", // Should be set later
    maxSupply: wei(100000n), // supply: 10M
    stepRanges: [
      wei(100n),
      wei(1000n),
      wei(2000n),
      wei(5000n),
      wei(10000n),
      wei(20000n),
      wei(50000n),
      wei(100000n),
    ],
    stepPrices: [
      wei(1n, 9),
      wei(2n, 9),
      wei(3n, 9),
      wei(4n, 9),
      wei(5n, 9),
      wei(7n, 9),
      wei(10n, 9),
      wei(15n, 9),
    ],
  },
};

const MAX_STEPS = getMaxSteps("sepolia");

describe("BobaFactory", function () {
  let bobaFactory: BobaFactory;

  let owner: Signer;
  let user: Signer;

  this.beforeEach(async function () {
    [owner, user] = await ethers.getSigners();

    // console.log("Owner address", await owner.getAddress());
    // [TokenImplementation, Bond] = await loadFixture(deployFixtures);

    const cmBond = (await ethers.getContractAt(
      "MCV2_Bond",
      "0x8dce343a86aa950d539eee0e166affd0ef515c0c"
    )) as MCV2_Bond;

    const BobaFactoryFactory = (await ethers.getContractFactory(
      "BobaFactory",
      owner
    )) as BobaFactory__factory;
    bobaFactory = await BobaFactoryFactory.connect(owner).deploy(
      await owner.getAddress()
    );

    BABY_TOKEN.tokenParams.symbol = makeid(4);
  });

  it("should deploy BobaFactory", async function () {
    const factoryAddress = await bobaFactory.getAddress();
    // console.log("Factory address", factoryAddress);
    expect(factoryAddress).to.not.be.undefined;
  });

  it("Should deploy BobaToken", async function () {
    let bobaAddress = await bobaFactory.getBobaAddress();
    expect(bobaAddress).to.not.be.undefined;
  });

  it("Should set counter to 0", async function () {
    let counter = await bobaFactory.getCount();
    expect(counter).to.equal(0);
  });

  it("should set owner correctly", async function () {
    let ownerAddress = await bobaFactory.owner();
    expect(ownerAddress).to.equal(await owner.getAddress());
  });

  it("should create a new token", async function () {
    let tx = await owner.sendTransaction({
      to: await bobaFactory.getAddress(),
      value: ethers.parseEther("0.1"),
    });

    let tokenAddress = await bobaFactory
      .connect(owner)
      .createNewToken(BABY_TOKEN.tokenParams, BABY_TOKEN.bondParams);

    await tokenAddress.wait(1);

    expect(tokenAddress).to.not.be.undefined;
  });

  it("Should create a new boba token", async function () {
    let tx = await owner.sendTransaction({
      to: await bobaFactory.getAddress(),
      value: ethers.parseEther("0.1"),
    });

    let uri = "https://example.com/token/0";

    let tx1 = await bobaFactory
      .connect(owner)
      .createBoba(await user.getAddress(), uri);

    await tx1.wait(1);

    expect(await bobaFactory.getCount()).to.equal(0);
  });

  it("should create a new pair", async function () {
    let tx = await owner.sendTransaction({
      to: await bobaFactory.getAddress(),
      value: ethers.parseEther("0.1"),
    });

    let uri = "https://example.com/token/0";
    let userAddress = await user.getAddress();
    // console.log("User address", userAddress);

    let tx1 = await bobaFactory
      .connect(owner)
      .createNewPair(
        BABY_TOKEN.tokenParams,
        BABY_TOKEN.bondParams,
        uri,
        userAddress
      );
    await tx1.wait(1);
    // console.log("Pair created");

    let tokenAddress = await bobaFactory.getTokenAddress(0n);
    expect(tokenAddress).to.not.be.undefined;
  });

  it("Should mint a new token", async function () {
    let tx = await owner.sendTransaction({
      to: await bobaFactory.getAddress(),
      value: ethers.parseEther("0.1"),
    });

    let uri = "https://example.com/token/0";
    let userAddress = await user.getAddress();

    let tx1 = await bobaFactory
      .connect(owner)
      .createNewPair(
        BABY_TOKEN.tokenParams,
        BABY_TOKEN.bondParams,
        uri,
        userAddress
      );
    await tx1.wait(1);

    // let count = await bobaFactory.getCount();
    // count = count - 1n;

    let tokenAddress = await bobaFactory.getTokenAddress(0n);

    // let token = await ethers.getContractAt("MCV2_Token", tokenAddress);
    // let decimal = await token.decimals();
    // console.log("Decimal", decimal.toString());
    let mintNum = 20000000000000000000n;

    let mint = await bobaFactory.connect(user).mint(0n, mintNum, mintNum, {
      value: 25000000000000000000n,
    });
    await mint.wait(1);

    let balance = await (
      await ethers.getContractAt("MCV2_Token", tokenAddress)
    ).balanceOf(await user.getAddress());
    // console.log("Balance", balance.toString());
    expect(balance).to.equal(mintNum);
  });

  it("Should burn a token", async function () {
    let tx = await owner.sendTransaction({
      to: await bobaFactory.getAddress(),
      value: ethers.parseEther("0.1"),
    });

    let uri = "https://example.com/token/0";
    let userAddress = await user.getAddress();

    let tx1 = await bobaFactory
      .connect(owner)
      .createNewPair(
        BABY_TOKEN.tokenParams,
        BABY_TOKEN.bondParams,
        uri,
        userAddress
      );
    await tx1.wait(1);

    let tokenAddress = await bobaFactory.getTokenAddress(0n);

    let mintNum = 20000000000000000000n;

    let mint = await bobaFactory.connect(user).mint(0n, mintNum, mintNum, {
      value: 25000000000000000000n,
    });
    await mint.wait(1);

    let balance = await (
      await ethers.getContractAt("MCV2_Token", tokenAddress)
    ).balanceOf(await user.getAddress());
    // console.log("Balance", balance.toString());

    await (await ethers.getContractAt("MCV2_Token", tokenAddress))
      .connect(user)
      .approve(ZAP, MaxUint256);

    let tr = await (await ethers.getContractAt("MCV2_Token", tokenAddress))
      .connect(user)
      .approve(await bobaFactory.getAddress(), MaxUint256);

    await tr.wait(1);

    let burn = await bobaFactory.connect(user).burn(0n, mintNum / 10n, 10n);
    await burn.wait(1);

    let balance1 = await (
      await ethers.getContractAt("MCV2_Token", tokenAddress)
    ).balanceOf(await user.getAddress());
    // console.log("Balance", balance1.toString());
    expect(balance1).to.equal(mintNum - mintNum / 10n);
  });

  it("Should correctly calculate Boba's level", async function () {
    let tx = await owner.sendTransaction({
      to: await bobaFactory.getAddress(),
      value: ethers.parseEther("0.1"),
    });

    let uri = "https://example.com/token/0";
    let userAddress = await user.getAddress();

    let tx1 = await bobaFactory
      .connect(owner)
      .createNewPair(
        BABY_TOKEN.tokenParams,
        BABY_TOKEN.bondParams,
        uri,
        userAddress
      );
    await tx1.wait(1);

    let count = await bobaFactory.getCount();

    let tokenAddress = await bobaFactory.getTokenAddress(count - 1n);
    let token = await ethers.getContractAt("MCV2_Token", tokenAddress);

    let mintNum = 2000000000000000000000n;

    // console.log((count - 1n).toString());

    let mint = await bobaFactory
      .connect(user)
      .mint(count - 1n, mintNum, mintNum / 100n, {
        value: 25000000000000000000n,
      });
    await mint.wait(1);

    let level = await bobaFactory.getBobaLevel(count - 1n);
    // console.log("Level", level.toString());
    let trueLevel =
      ((await token.totalSupply()) * 100n) / BABY_TOKEN.bondParams.maxSupply;

    // console.log("total supply", await token.totalSupply());
    // console.log("max supply", BABY_TOKEN.bondParams.maxSupply);
    expect(level).to.equal(trueLevel);
  });
});
