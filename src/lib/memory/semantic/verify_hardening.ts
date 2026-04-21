import { SemanticDiagnostics } from "./diagnostics";

async function verify() {
  console.log("Starting Layer 2.5 Hardening Verification...");
  
  const report = await SemanticDiagnostics.runFullSuite();
  
  console.log("\n--- DIAGNOSTIC REPORT ---");
  report.results.forEach(res => {
    const icon = res.status === 'PASS' ? '✅' : '❌';
    console.log(`${icon} [${res.status}] ${res.name}`);
    if (res.error) console.error(`   Error: ${res.error}`);
  });
  console.log("-------------------------\n");

  const anyFail = report.results.some(r => r.status === 'FAIL');
  if (anyFail) {
    console.error("Hardening Verification FAILED.");
    process.exit(1);
  } else {
    console.log("Hardening Verification PASSED.");
    process.exit(0);
  }
}

verify().catch(err => {
  console.error("Fatal Runner Error:", err);
  process.exit(1);
});
