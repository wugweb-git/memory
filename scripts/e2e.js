import request from 'supertest';

async function expectStatus(responsePromise, expectedStatus, label) {
  const response = await responsePromise;
  if (response.status !== expectedStatus) {
    throw new Error(`${label} expected ${expectedStatus}, got ${response.status}. Body: ${JSON.stringify(response.body)}`);
  }
  return response;
}

async function run() {
  process.env.AUTH_SECRET = process.env.AUTH_SECRET || 'test-secret';
  const { default: app } = await import('../src/server.js');

  const email = `e2e_${Date.now()}@example.com`;
  const password = 'E2ePassw0rd!';

  const signup = await expectStatus(request(app).post('/api/auth/signup').send({ email, password }), 201, 'signup');
  const token = signup.body.access_token;

  const created = await expectStatus(
    request(app).post('/api/items').set('Authorization', `Bearer ${token}`).send({ raw: 'first memory' }),
    201,
    'createItem'
  );

  const itemId = created.body.item?._id;
  await expectStatus(request(app).get('/api/items').set('Authorization', `Bearer ${token}`), 200, 'listItems');
  await expectStatus(request(app).post('/api/sync').set('Authorization', `Bearer ${token}`).send({ item_id: itemId, raw: 'updated memory' }), 200, 'syncItem');
  await expectStatus(request(app).post('/api/email').set('Authorization', `Bearer ${token}`).send({ subject: 's', body: 'b', from: 'f@example.com' }), 201, 'emailIngest');
  await expectStatus(request(app).delete('/api/items').set('Authorization', `Bearer ${token}`).send({ item_id: itemId }), 200, 'deleteItem');

  console.log('E2E PASS');
}

run().catch((err) => {
  console.error('E2E FAIL:', err.message);
  process.exit(1);
});
