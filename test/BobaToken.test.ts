import { ethers } from "hardhat";
import { expect } from "chai";
import { Signer, toBigInt } from "ethers";
import {
  BobaToken,
  BobaToken__factory,
  NFTMarketplace,
  NFTMarketplace__factory,
  ERC721,
} from "../typechain-types";

describe("BobaToken", function () {
  let BobaToken: BobaToken;
  let owner: Signer;
  let addr1: Signer;

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();

    const BobaTokenFactory = (await ethers.getContractFactory(
      "BobaToken",
      owner
    )) as BobaToken__factory;
    BobaToken = await BobaTokenFactory.connect(owner).deploy(
      owner.getAddress()
    );
  });

  it("should deploy BobaToken", async function () {
    const bobaAddress = await BobaToken.getAddress();
    expect(bobaAddress).to.not.equal(0x0);
  });

  it("Should mint a new NFT", async function () {
    const tokenId = 1;
    await BobaToken.safeMint(
      owner.getAddress(),
      tokenId,
      "https://token.example"
    );
    const ownerOfToken = await BobaToken.ownerOf(tokenId);
    expect(ownerOfToken).to.equal(await owner.getAddress());
  });

  it("Should transfer NFT to another address", async function () {
    const tokenId = 1;
    await BobaToken.safeMint(
      owner.getAddress(),
      tokenId,
      "https://token.example"
    );
    await BobaToken.transferFrom(
      owner.getAddress(),
      addr1.getAddress(),
      tokenId
    );
    const ownerOfToken = await BobaToken.ownerOf(tokenId);
    console.log("ownerOfToken", ownerOfToken);
    expect(ownerOfToken).to.equal(await addr1.getAddress());
  });

  it("Should approve NFT to another address", async function () {
    const tokenId = 1;
    await BobaToken.safeMint(
      owner.getAddress(),
      tokenId,
      "https://token.example"
    );
    await BobaToken.approve(addr1.getAddress(), tokenId);
    const approvedAddress = await BobaToken.getApproved(tokenId);
    expect(approvedAddress).to.equal(await addr1.getAddress());
  });
});
