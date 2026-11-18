// Verify AgentBoard source on BscScan after deployment.
// Usage: BSCSCAN_API_KEY=<key> node scripts/verify.js
// Reads scripts/deployed.json for the address. The contract is a single flat
// file (no imports), so contracts/AgentBoard.sol is the verification input.
// Compiler settings must match the build: solc 0.8.26, optimizer ON, runs 200.
const fs = require("fs");
const path = require("path");

const API = "https://api.bscscan.com/api";

async function main() {
  const apiKey = process.env.BSCSCAN_API_KEY;
  if (!apiKey) {
    console.error("Missing BSCSCAN_API_KEY env var (free key from bscscan.com).");
    process.exit(1);
  }
  const deployed = JSON.parse(fs.readFileSync(path.join(__dirname, "deployed.json"), "utf8"));
  const source = fs.readFileSync(path.join(__dirname, "..", "contracts", "AgentBoard.sol"), "utf8");
  const params = new URLSearchParams({
    module: "contract",
    action: "verifysourcecode",
    contractaddress: deployed.address,
    sourceCode: source,
    codeformat: "solidity-single-file",
    contractname: "AgentBoard",
    compilerversion: "v0.8.26+commit.8a97fa7a",
    optimizationUsed: "1",
    runs: "200",
    licenseType: "3", // MIT
    apikey: apiKey,
  });
  const res = await fetch(API, { method: "POST", body: params });
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
  if (data.message === "OK" && data.result) {
    console.log("Verification submitted. Check status:");
    console.log(`  curl "https://api.bscscan.com/api?module=contract&action=checkverifystatus&guid=${data.result}&apikey=$BSCSCAN_API_KEY"`);
  }
}

main().catch((e) => { console.error("VERIFY FAILED:", e.message); process.exit(1); });
