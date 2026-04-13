const express = require('express');
const {
  createItem,
  syncItem,
  listItems,
  listHealthQueue
} = require('../controllers/itemController');

const router = express.Router();

router.post('/items', createItem);
router.get('/items', listItems);
router.post('/sync', syncItem);
router.get('/health-queue', listHealthQueue);

module.exports = router;
