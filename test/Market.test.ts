import { ethers } from "hardhat";
import { expect } from "chai";
import {
  NFTMarketplace,
  NFTMarketplace__factory,
  BobaFactory,
  BobaFactory__factory,
  MCV2_Bond,
  MCV2_Token,
  BobaToken,
  Ownable,
} from "../typechain-types";
import { wei, getMaxSteps } from "./utils/test-utils";
import { Signer } from "ethers";

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

describe("Market", function () {
  let market: NFTMarketplace;
  let owner: Signer;
  let user1: Signer;
  let user2: Signer;
  let bobaFactory: BobaFactory;

  this.beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    const marketplaceFactory = new NFTMarketplace__factory(owner);
    market = await marketplaceFactory.connect(owner).deploy();

    const factoryFactory = new BobaFactory__factory(owner);
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

  it("should deploy the contract", async function () {
    expect(await market.getAddress()).to.exist;
    expect(await bobaFactory.getAddress()).to.exist;
  });

  it("Should set owner correctly", async function () {
    expect(await market.getOwner()).to.equal(await owner.getAddress());
  });

  it("Should deploy BobaToken", async function () {
    const bobaAddress = await bobaFactory.getBobaAddress();
    expect(bobaAddress).to.be.exist;
  });

  it("Should init the list fee correctly", async function () {
    const listPrice = await market.getListingPrice();
    expect(listPrice).to.equal(wei(25n, 15));
  });

  it("Should set the list fee correctly", async function () {
    await market.setListingPrice(wei(100n, 15));
    const listPrice = await market.getListingPrice();
    expect(listPrice).to.equal(wei(100n, 15));
  });

  it("Should user create a new market item", async function () {
    let tx = await owner.sendTransaction({
      to: await bobaFactory.getAddress(),
      value: ethers.parseEther("0.1"),
    });

    let uri = "https://example.com/token/0";
    let user1Address = await user1.getAddress();

    let tx1 = await bobaFactory
      .connect(owner)
      .createNewPair(
        BABY_TOKEN.tokenParams,
        BABY_TOKEN.bondParams,
        uri,
        user1Address
      );
    await tx1.wait(1);

    let nftAddress = await bobaFactory.getBobaAddress();
    let nftId = (await bobaFactory.getCount()) - 1n;

    let bobaToken = (await ethers.getContractAt(
      "BobaToken",
      nftAddress
    )) as BobaToken;

    await bobaToken.connect(user1).approve(await market.getAddress(), nftId);

    let tx2 = await market
      .connect(user1)
      .createMarketItem(nftAddress, nftId, wei(1n, 18), {
        value: wei(25n, 15),
      });
    await tx2.wait(1);

    let items = await market.fetchMarketItems();
    expect(items.length).to.equal(1);
  });

  it("Should user buy a market item", async function () {
    let tx = await owner.sendTransaction({
      to: await bobaFactory.getAddress(),
      value: ethers.parseEther("0.1"),
    });

    let uri = "https://example.com/token/0";
    let user1Address = await user1.getAddress();
    let user2Address = await user2.getAddress();

    let tx1 = await bobaFactory
      .connect(owner)
      .createNewPair(
        BABY_TOKEN.tokenParams,
        BABY_TOKEN.bondParams,
        uri,
        user1Address
      );
    await tx1.wait(1);

    let nftAddress = await bobaFactory.getBobaAddress();
    let nftId = (await bobaFactory.getCount()) - 1n;

    let bobaToken = (await ethers.getContractAt(
      "BobaToken",
      nftAddress
    )) as BobaToken;

    await bobaToken.connect(user1).approve(await market.getAddress(), nftId);

    let tx2 = await market
      .connect(user1)
      .createMarketItem(nftAddress, nftId, wei(1n, 18), {
        value: wei(25n, 15),
      });
    await tx2.wait(1);

    let items = await market.fetchMarketItems();
    expect(items.length).to.equal(1);

    let itemId = items[0].itemId;

    let tx3 = await market.connect(user2).buyMarketItem(nftAddress, itemId, {
      value: wei(1n, 18),
    });
    await tx3.wait(1);

    items = await market.fetchMarketItems();
    expect(items.length).to.equal(0);
  });
});
