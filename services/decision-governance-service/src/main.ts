import { startGovernanceService } from "./bootstrap/main.js";

try { await startGovernanceService(); }
catch (error) { console.error(error); process.exitCode = 1; }
