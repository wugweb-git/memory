const { connectDB } = require('../lib/db');
const Item = require('../models/Item');

module.exports = async function handler(req, res) {
  await connectDB();

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const broken = await Item.find({ 'sync.link_status': 'broken' })
    .sort({ 'origin.created_at': -1 })
    .limit(50);

  return res.status(200).json(broken);
};
