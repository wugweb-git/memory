import express from 'express';
import {
  createItem,
  syncItem,
  listItems,
  listHealthQueue
} from '../controllers/itemController.js';

const router = express.Router();

router.post('/items', createItem);
router.get('/items', listItems);
router.post('/sync', syncItem);
router.get('/health-queue', listHealthQueue);

export default router;
