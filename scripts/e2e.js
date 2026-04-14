import mongoose from 'mongoose';
import request from 'supertest';

async function run() {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required');

  process.env.AUTH_SECRET = process.env.AUTH_SECRET || 'test-secret';
  const { default: app } = await import('../src/server.js');

  const email = `e2e_${Date.now()}@example.com`;
  const password = 'E2ePassw0rd!';

  const signup = await request(app).post('/api/auth/signup').send({ email, password }).expect(201);
  const token = signup.body.access_token;

  const created = await request(app)
    .post('/api/items')
    .set('Authorization', `Bearer ${token}`)
    .send({ raw: 'first memory' })
    .expect(201);

  const itemId = created.body.item?._id;
  await request(app).get('/api/items').set('Authorization', `Bearer ${token}`).expect(200);
  await request(app).post('/api/sync').set('Authorization', `Bearer ${token}`).send({ item_id: itemId, raw: 'updated memory' }).expect(200);
  await request(app).post('/api/email').set('Authorization', `Bearer ${token}`).send({ subject: 's', body: 'b', from: 'f@example.com' }).expect(201);
  await request(app).delete('/api/items').set('Authorization', `Bearer ${token}`).send({ item_id: itemId }).expect(200);

  await mongoose.disconnect();
  console.log('E2E PASS');
}

run().catch(async (err) => {
  console.error('E2E FAIL:', err.message);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});
