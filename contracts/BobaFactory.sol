// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {MCV2_ZapV1} from "./MCV2_ZapV1.sol";
import {MCV2_Token} from "./MCV2_Token.sol";
import {MCV2_Bond} from "./MCV2_Bond.sol";
import "./Boba.sol";

import "hardhat/console.sol";

contract BobaFactory is Ownable {
    BobaToken public boba;
    MCV2_Bond public mcBond;
    MCV2_Token public mcToken;
    MCV2_ZapV1 public mcZap;
    uint256 public count;

    struct BondParams {
        uint16 mintRoyalty;
        uint16 burnRoyalty;
        address reserveToken;
        uint128 maxSupply;
        uint128[] stepRanges;
        uint128[] stepPrices;
    }

    struct TokenParams {
        string name;
        string symbol;
    }

    mapping(uint256 => address) public expCruve;

    constructor(address initialOwner) Ownable(initialOwner) {
        boba = new BobaToken(address(this));
        mcBond = MCV2_Bond(0x8dce343A86Aa950d539eeE0e166AFfd0Ef515C0c);
        mcZap = MCV2_ZapV1(payable(0x1Bf3183acc57571BecAea0E238d6C3A4d00633da));
        count = 0;
    }

    receive() external payable {}

    // function addPair(uint256 tokenId, address tokenAddress) public onlyOwner {
    //     expCruve[tokenId] = tokenAddress;
    // }

    function createNewToken(
        TokenParams memory tp,
        BondParams memory bp
    ) public returns (address expToken) {
        expToken = mcBond.createToken(
            MCV2_Bond.TokenParams(tp.name, tp.symbol),
            MCV2_Bond.BondParams(
                bp.mintRoyalty,
                bp.burnRoyalty,
                bp.reserveToken,
                bp.maxSupply,
                bp.stepRanges,
                bp.stepPrices
            )
        );
        require(expToken != address(0), "Token creation failed");
        return expToken;
    }

    function createBoba(address recipient, string memory uri) public onlyOwner {
        boba.safeMint(recipient, count, uri);
    }

    function createNewPair(
        TokenParams memory tp,
        BondParams memory bp,
        string calldata uri,
        address recipient
    ) public onlyOwner {
        createBoba(recipient, uri);
        address expToken = createNewToken(tp, bp);
        expCruve[count] = expToken;
        count++;
    }

    function mint(uint256 tokenId, uint amount, uint ethAmount) public payable {
        address tokenAddress = expCruve[tokenId];
        // console.log(address(this).balance);
        // console.log(ethAmount);
        mcZap.mintWithEth{value: ethAmount}(tokenAddress, amount, msg.sender);
    }

    function burn(
        uint256 tokenId,
        uint256 amount,
        uint256 refoundAmount
    ) public payable {
        address tokenAddress = expCruve[tokenId];
        // console.log(address(this).balance);
        MCV2_Token(tokenAddress).transferFrom(
            msg.sender,
            address(this),
            amount
        );
        MCV2_Token(tokenAddress).approve(address(mcZap), amount);
        mcZap.burnToEth(tokenAddress, amount, refoundAmount, msg.sender);
    }

    function getBobaLevel(uint256 tokenId) public view returns (uint256 level) {
        address tokenAddress = expCruve[tokenId];
        MCV2_Token token = MCV2_Token(tokenAddress);
        level = (token.totalSupply() * 100) / mcBond.maxSupply(tokenAddress);
        return level;
    }

    function getTokenAddress(uint256 tokenId) public view returns (address) {
        return expCruve[tokenId];
    }

    function getBobaOwner(uint256 tokenId) public view returns (address) {
        return boba.ownerOf(tokenId);
    }

    function getBobaAddress() public view returns (address) {
        return address(boba);
    }

    function getCount() public view returns (uint256) {
        return count;
    }
}
