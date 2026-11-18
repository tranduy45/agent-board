// Deploy AgentBoard to BNB Chain mainnet (chain 56).
// Usage:
//   DEPLOYER_KEY=0x<private key> node scripts/deploy.js
//   node scripts/deploy.js --keyfile /path/to/key.txt   (file holding the hex key)
// Optional env: BSC_RPC (default https://bsc-dataseed1.binance.org)
// The deployer key is NEVER written to disk by this script except the
// deployment record in scripts/deployed.json, which holds NO secret.
// The deployer only pays gas. The contract has no owner, so the deployer
// keeps no power over it after deployment.
const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");

const ROOT = path.join(__dirname, "..");

async function main() {
  const args = process.argv.slice(2);
  let key = process.env.DEPLOYER_KEY || "";
  const kf = args.indexOf("--keyfile");
  if (kf >= 0 && args[kf + 1]) {
    key = fs.readFileSync(args[kf + 1], "utf8").trim();
  }
  if (!key) {
    console.error("Missing deployer key. Set DEPLOYER_KEY or pass --keyfile <path>.");
    process.exit(1);
  }
  if (!key.startsWith("0x")) key = "0x" + key;

  const rpc = process.env.BSC_RPC || "https://bsc-dataseed1.binance.org";
  const provider = new ethers.JsonRpcProvider(rpc, 56);
  const wallet = new ethers.Wallet(key, provider);
  console.log("deployer:", wallet.address);

  const balance = await provider.getBalance(wallet.address);
  console.log("balance:", ethers.formatEther(balance), "BNB");

  const abi = JSON.parse(fs.readFileSync(path.join(ROOT, "build", "AgentBoard.abi.json"), "utf8"));
  const bytecode = fs.readFileSync(path.join(ROOT, "build", "AgentBoard.bytecode.txt"), "utf8").trim();
  const factory = new ethers.ContractFactory(abi, bytecode, wallet);

  const deployTx = await factory.getDeployTransaction();
  const gas = await provider.estimateGas({ ...deployTx, from: wallet.address });
  const fee = await provider.getFeeData();
  const price = fee.gasPrice ?? 3000000000n; // fall back to 3 gwei
  const cost = gas * price;
  console.log("estimated gas:", gas.toString());
  console.log("gas price (gwei):", ethers.formatUnits(price, "gwei"));
  console.log("estimated cost:", ethers.formatEther(cost), "BNB");
  if (balance < cost) {
    console.error("INSUFFICIENT BALANCE: need ~" + ethers.formatEther(cost) + " BNB for gas, have " + ethers.formatEther(balance) + " BNB. Top up and retry.");
    process.exit(1);
  }

  console.log("deploying…");
  const contract = await factory.deploy();
  const receipt = await contract.deploymentTransaction().wait();
  const address = await contract.getAddress();
  const record = {
    contract: "AgentBoard",
    address,
    chainId: 56,
    deployTxHash: receipt.hash,
    deployBlock: receipt.blockNumber,
    gasUsed: receipt.gasUsed.toString(),
    deployer: wallet.address,
    deployedAt: new Date().toISOString(),
    compiler: "solc 0.8.26, optimizer enabled, runs 200",
  };
  fs.writeFileSync(path.join(__dirname, "deployed.json"), JSON.stringify(record, null, 2));
  console.log("DEPLOYED");
  console.log("address:", address);
  console.log("tx:", receipt.hash);
  console.log("block:", receipt.blockNumber);
  console.log("gas used:", receipt.gasUsed.toString());
  console.log("record written to scripts/deployed.json");
  console.log("Next steps:");
  console.log("  1. node scripts/verify.js   (BscScan source verification; needs BSCSCAN_API_KEY)");
  console.log("  2. Put the address + block into docs/index.html CONFIG and commit.");
}

main().catch((e) => { console.error("DEPLOY FAILED:", e.shortMessage || e.message); process.exit(1); });
