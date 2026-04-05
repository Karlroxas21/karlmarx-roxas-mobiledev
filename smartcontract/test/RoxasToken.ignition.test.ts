import { expect } from "chai";
import { network } from "hardhat";
import RoxasTokenModule from "../ignition/modules/RoxasToken.js";

const { ethers, ignition } = await network.connect();

describe("RoxasToken Ignition Module", function () {
  it("deploys successfully via Ignition on local Hardhat network", async function () {
    const { token } = await ignition.deploy(RoxasTokenModule);
    expect(token).to.not.be.undefined;
  });

  it("deployed contract has correct name", async function () {
    const { token } = await ignition.deploy(RoxasTokenModule);
    expect(await token.name()).to.equal("Roxas Token");
  });

  it("deployed contract has correct symbol", async function () {
    const { token } = await ignition.deploy(RoxasTokenModule);
    expect(await token.symbol()).to.equal("RXS");
  });

  it("deployed contract has correct cap", async function () {
    const { token } = await ignition.deploy(RoxasTokenModule);
    const expectedCap = ethers.parseEther("10000000");
    expect(await token.cap()).to.equal(expectedCap);
  });

  it("deployed contract has correct initial supply minted to deployer", async function () {
    const { token } = await ignition.deploy(RoxasTokenModule);
    const expectedSupply = ethers.parseEther("1000000");
    expect(await token.totalSupply()).to.equal(expectedSupply);
  });
});
