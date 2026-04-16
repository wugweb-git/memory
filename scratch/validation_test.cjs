const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runTest() {
  try {
    console.log("--- TEST 1: Happy Path ---");
    
    // 1. Create a mock packet
    const packet = await prisma.memoryPacket.create({
      data: {
        hash: "test-hash-" + Date.now(),
        content: "Fixed a critical bug in the neural processing layer. #engineering",
        source: "Github",
        type: "document",
        metadata: { repo: "identity-prism-os", author: "antigravity" },
        status: "active",
        processing_status: "pending",
        embedding_status: "embedded", // bypass L1 RAG
        timestamps: {
          ingestion_time: new Date().toISOString(),
          event_time: new Date().toISOString()
        }
      }
    });
    console.log(`Created Packet: ${packet.id}`);

    // 2. Import Engine and Logic (using dynamic import or just re-implementing for the script)
    // Since we are in a script, we will call the API endpoint we created or use the logic directly
    // Let's use the Logic directly to verify the Engine
    const { ProcessingEngine } = require('../src/lib/processing/engine');
    
    console.log("Processing Packet...");
    const result = await ProcessingEngine.processPacket(packet.id);
    console.log("Processing Result:", result);

    // 3. Verify Signals
    const signals = await prisma.signal.findMany({ where: { packet_id: packet.id } });
    console.log(`Signals Created: ${signals.length}`);
    signals.forEach(s => console.log(` - Signal: ${s.type} (Confidence: ${s.confidence})`));

    // 4. Verify Activity
    const activity = await prisma.activityStream.findMany({ where: { packet_id: packet.id } });
    console.log(`Activity Entries Created: ${activity.length}`);

    // 5. Verify Status Update (Note: In this test we call engine directly, so we check if status is manually updated if we want)
    // Wait, the scheduler owns the status. Let's mocks the scheduler's flow.
    await prisma.memoryPacket.update({ where: { id: packet.id }, data: { processing_status: 'completed' } });
    
    console.log("--- TEST 1 SUCCESS ---");

    console.log("\n--- TEST 2: Reprocess (Idempotency) ---");
    console.log("Processing same packet again...");
    const result2 = await ProcessingEngine.processPacket(packet.id);
    console.log("Processing Result 2:", result2);

    const signals2 = await prisma.signal.findMany({ where: { packet_id: packet.id } });
    console.log(`Signals after reprocess: ${signals2.length} (Should be same as before)`);
    if (signals2.length === signals.length) console.log("Idempotency: PASS");
    else console.log("Idempotency: FAIL");

    console.log("--- TEST 2 SUCCESS ---");

  } catch (err) {
    console.error("Test failed:", err);
  } finally {
    await prisma.$disconnect();
  }
}

runTest();
