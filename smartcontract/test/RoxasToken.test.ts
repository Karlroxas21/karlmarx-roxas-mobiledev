import { expect } from "chai";
import { network } from "hardhat";
import { anyValue } from "@nomicfoundation/hardhat-ethers-chai-matchers/withArgs";

const { ethers, networkHelpers } = await network.connect();

async function deployFixture() {
  const [owner, user1, user2] = await ethers.getSigners();
  const token = await ethers.deployContract("RoxasToken");
  return { token, owner, user1, user2 };
}

async function nearCapFixture() {
  const signers = await ethers.getSigners();
  const token = await ethers.deployContract("RoxasToken");
  const mintAmount = ethers.parseEther("1000");
  const cap = await token.cap();

  // Mint with all signers in rounds until within 1000 RXS of cap
  while ((cap - (await token.totalSupply())) > mintAmount) {
    const remaining = cap - (await token.totalSupply());
    const mintsThisRound = Math.min(
      signers.length,
      Number(remaining / mintAmount)
    );
    for (let i = 0; i < mintsThisRound; i++) {
      await token.connect(signers[i]).mint(mintAmount);
    }
    await networkHelpers.time.increase(61);
  }

  return { token, signers };
}

describe("RoxasToken", function () {
  describe("Deployment", function () {
    it("should have the correct name", async function () {
      const { token } = await networkHelpers.loadFixture(deployFixture);
      expect(await token.name()).to.equal("Roxas Token");
    });

    it("should have the correct symbol", async function () {
      const { token } = await networkHelpers.loadFixture(deployFixture);
      expect(await token.symbol()).to.equal("RXS");
    });

    it("should have 18 decimals", async function () {
      const { token } = await networkHelpers.loadFixture(deployFixture);
      expect(await token.decimals()).to.equal(18n);
    });

    it("should mint initial supply to deployer", async function () {
      const { token, owner } = await networkHelpers.loadFixture(deployFixture);
      const initialSupply = ethers.parseEther("1000000");
      expect(await token.balanceOf(owner.address)).to.equal(initialSupply);
      expect(await token.totalSupply()).to.equal(initialSupply);
    });

    it("should set the correct cap", async function () {
      const { token } = await networkHelpers.loadFixture(deployFixture);
      expect(await token.cap()).to.equal(ethers.parseEther("10000000"));
    });
  });

  describe("Minting", function () {
    it("should allow public minting", async function () {
      const { token, user1 } = await networkHelpers.loadFixture(deployFixture);
      const mintAmount = ethers.parseEther("500");
      await token.connect(user1).mint(mintAmount);
      expect(await token.balanceOf(user1.address)).to.equal(mintAmount);
      expect(await token.totalSupply()).to.equal(
        ethers.parseEther("1000000") + mintAmount
      );
    });

    it("should emit TokensMinted event", async function () {
      const { token, user1 } = await networkHelpers.loadFixture(deployFixture);
      const mintAmount = ethers.parseEther("500");
      await expect(token.connect(user1).mint(mintAmount))
        .to.emit(token, "TokensMinted")
        .withArgs(user1.address, mintAmount);
    });

    it("should update totalSupply after minting", async function () {
      const { token, user1 } = await networkHelpers.loadFixture(deployFixture);
      const supplyBefore = await token.totalSupply();
      const mintAmount = ethers.parseEther("300");
      await token.connect(user1).mint(mintAmount);
      expect(await token.totalSupply()).to.equal(supplyBefore + mintAmount);
    });

    it("should revert when amount exceeds mint limit", async function () {
      const { token, user1 } = await networkHelpers.loadFixture(deployFixture);
      await expect(
        token.connect(user1).mint(ethers.parseEther("1001"))
      )
        .to.be.revertedWithCustomError(token, "MintLimitExceeded")
        .withArgs(ethers.parseEther("1001"), ethers.parseEther("1000"));
    });

    it("should revert when amount is zero", async function () {
      const { token, user1 } = await networkHelpers.loadFixture(deployFixture);
      await expect(token.connect(user1).mint(0n))
        .to.be.revertedWithCustomError(token, "MintLimitExceeded")
        .withArgs(0n, ethers.parseEther("1000"));
    });

    it("should revert when cooldown has not elapsed", async function () {
      const { token, user1 } = await networkHelpers.loadFixture(deployFixture);
      await token.connect(user1).mint(ethers.parseEther("100"));
      await expect(
        token.connect(user1).mint(ethers.parseEther("100"))
      )
        .to.be.revertedWithCustomError(token, "CooldownNotElapsed")
        .withArgs(anyValue);
    });

    it("should allow minting after cooldown elapses", async function () {
      const { token, user1 } = await networkHelpers.loadFixture(deployFixture);
      await token.connect(user1).mint(ethers.parseEther("100"));
      await networkHelpers.time.increase(61);
      await token.connect(user1).mint(ethers.parseEther("100"));
      expect(await token.balanceOf(user1.address)).to.equal(
        ethers.parseEther("200")
      );
    });

    it("should report cooldown remaining", async function () {
      const { token, user1 } = await networkHelpers.loadFixture(deployFixture);
      await token.connect(user1).mint(ethers.parseEther("100"));
      expect(await token.cooldownRemaining(user1.address)).to.be.greaterThan(
        0n
      );
      await networkHelpers.time.increase(61);
      expect(await token.cooldownRemaining(user1.address)).to.equal(0n);
    });
  });

  describe("Cap enforcement", function () {
    this.timeout(120_000);

    it("should revert when mint would exceed cap", async function () {
      const { token, signers } =
        await networkHelpers.loadFixture(nearCapFixture);
      const cap = await token.cap();
      const totalSupply = await token.totalSupply();
      const remaining = cap - totalSupply;

      // remaining is <= 1000 RXS at this point
      // Advance time so signers can mint again after the fixture loop
      await networkHelpers.time.increase(61);

      // If there is remaining space, fill it exactly first
      if (remaining > 0n) {
        await token.connect(signers[0]).mint(remaining);
        await networkHelpers.time.increase(61);
      }

      // Now totalSupply == cap, any mint should revert
      await expect(
        token.connect(signers[1]).mint(ethers.parseEther("1"))
      ).to.be.revertedWithCustomError(token, "ERC20ExceededCap");
    });

    it("should allow minting exactly to the cap", async function () {
      const { token, signers } =
        await networkHelpers.loadFixture(nearCapFixture);
      const cap = await token.cap();
      const totalSupply = await token.totalSupply();
      const remaining = cap - totalSupply;

      // Advance time so signers can mint again
      await networkHelpers.time.increase(61);

      // Mint exactly the remaining amount to reach cap
      if (remaining > 0n) {
        await token.connect(signers[0]).mint(remaining);
      }

      expect(await token.totalSupply()).to.equal(cap);

      // Any further mint should revert
      await networkHelpers.time.increase(61);
      await expect(
        token.connect(signers[1]).mint(ethers.parseEther("1"))
      ).to.be.revertedWithCustomError(token, "ERC20ExceededCap");
    });
  });
});
