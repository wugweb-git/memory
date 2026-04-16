const { MongoClient } = require('mongodb');
const uri = "mongodb+srv://vedanshu_db_user:015sQd25LFeF24kZ@cluster0.qstcdiz.mongodb.net/identity-prism?appName=Cluster0";
const client = new MongoClient(uri);
async function run() {
  try {
    console.log("Connecting...");
    await client.connect();
    console.log("Connected successfully!");
    const db = client.db();
    const collections = await db.listCollections().toArray();
    console.log("Collections:", collections.map(c => c.name));
  } catch (err) {
    console.error("Connection failed:", err);
  } finally {
    await client.close();
  }
}
run();
