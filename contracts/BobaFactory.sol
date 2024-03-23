// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {MCV2_ZapV1} from "./MCV2_ZapV1.sol";
import {MCV2_Token} from "./MCV2_Token.sol";
import {MCV2_Bond} from "./MCV2_Bond.sol";
import "./Boba.sol";

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
        boba = new BobaToken(initialOwner);
        mcBond = MCV2_Bond(0x8dce343A86Aa950d539eeE0e166AFfd0Ef515C0c);
        // mcToken = new MCV2_Token(0x749bA94344521727f55a3007c777FbeB5F52C2Eb);
        mcZap = MCV2_ZapV1(payable(0x1Bf3183acc57571BecAea0E238d6C3A4d00633da));
        count = 0;
    }

    function addPair(uint256 tokenId, address tokenAddress) public onlyOwner {
        expCruve[tokenId] = tokenAddress;
    }

    function createNewToken(
        TokenParams calldata tp,
        BondParams calldata bp
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
        return expToken;
    }

    function createBoba(
        address recipient,
        uint256 tokenId,
        string memory uri
    ) public onlyOwner {
        boba.safeMint(recipient, tokenId, uri);
    }

    function createNewPair(
        TokenParams calldata tp,
        BondParams calldata bp,
        string memory uri,
        address recipient
    ) public onlyOwner {
        address expToken = createNewToken(tp, bp);
        createBoba(recipient, count, uri);
        addPair(count, expToken);
        count++;
    }

    function mint(uint256 tokenId, uint256 amount) public {
        address tokenAddress = expCruve[tokenId];
        mcZap.mintWithEth(tokenAddress, amount, msg.sender);
    }

    function burn(
        uint256 tokenId,
        uint256 amount,
        uint256 refoundAmount
    ) public {
        address tokenAddress = expCruve[tokenId];
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
}
