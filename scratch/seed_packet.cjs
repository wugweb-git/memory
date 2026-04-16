const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seed() {
  try {
    const packet = await prisma.memoryPacket.create({
      data: {
        type: "document",
        source: "Gmail",
        source_id: "test-msg-" + Date.now(),
        content: "Drafted a research paper on quantum neural networks. #learning #research",
        metadata: { subject: "Research Paper Draft", author: "antigravity" },
        event_time: new Date(),
        hash: "test-hash-" + Date.now(),
        trace: { origin: "manual_test", ingestion_path: "validation_script" },
        status: "active",
        processing_status: "pending",
        embedding_status: "embedded"
      }
    });
    console.log(packet.id);
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}
seed();
