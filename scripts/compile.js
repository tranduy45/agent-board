// Compile contracts/AgentBoard.sol with solcjs and write ABI + bytecode to build/.
// Usage: node scripts/compile.js
// Compiler settings (recorded for BscScan verification): solc 0.8.26, optimizer enabled, runs 200, evmVersion default.
const fs = require("fs");
const path = require("path");
const solc = require("solc");

const ROOT = path.join(__dirname, "..");
const SOURCE_PATH = path.join(ROOT, "contracts", "AgentBoard.sol");
const OUT_DIR = path.join(ROOT, "build");

const source = fs.readFileSync(SOURCE_PATH, "utf8");
const input = {
  language: "Solidity",
  sources: { "AgentBoard.sol": { content: source } },
  settings: {
    optimizer: { enabled: true, runs: 200 },
    outputSelection: { "*": { "*": ["abi", "evm.bytecode.object", "evm.deployedBytecode.object"] } },
  },
};

const output = JSON.parse(solc.compile(JSON.stringify(input)));
if (output.errors) {
  const fatal = output.errors.filter((e) => e.severity === "error");
  for (const e of output.errors) console.log(e.formattedMessage || e.message);
  if (fatal.length) process.exit(1);
}
const contract = output.contracts["AgentBoard.sol"]["AgentBoard"];
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, "AgentBoard.abi.json"), JSON.stringify(contract.abi, null, 2));
fs.writeFileSync(path.join(OUT_DIR, "AgentBoard.bytecode.txt"), "0x" + contract.evm.bytecode.object);
fs.writeFileSync(path.join(OUT_DIR, "AgentBoard.deployedBytecode.txt"), "0x" + contract.evm.deployedBytecode.object);
const creationBytes = contract.evm.bytecode.object.length / 2;
const runtimeBytes = contract.evm.deployedBytecode.object.length / 2;
console.log("compiled OK");
console.log("creation bytecode:", creationBytes, "bytes");
console.log("runtime bytecode:", runtimeBytes, "bytes");
console.log("solc version:", solc.version());
