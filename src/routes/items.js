const express = require('express');
const { createItem, syncItem, listItems } = require('../controllers/itemController');

const router = express.Router();

router.post('/items', createItem);
router.get('/items', listItems);
router.post('/sync', syncItem);

module.exports = router;
