import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("RoxasTokenModule", (m) => {
  const token = m.contract("RoxasToken");
  return { token };
});
