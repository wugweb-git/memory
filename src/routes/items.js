const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const {
  createItem,
  uploadFile,
  ingestEmail,
  syncItem,
  listItems,
  listHealthQueue
} = require('../controllers/itemController');

const router = express.Router();

function uploadDirectory() {
  // Vercel has writable temp storage only under /tmp.
  return process.env.VERCEL ? '/tmp/uploads' : 'uploads';
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = uploadDirectory();
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`)
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = /pdf|doc|docx|png|jpg|jpeg|gif/i;
    const ext = path.extname(file.originalname);
    if (allowed.test(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only pdf, doc, docx, and image files are allowed'));
    }
  }
});

router.post('/items', createItem);
router.get('/items', listItems);
router.post('/sync', syncItem);
router.post('/upload', upload.single('file'), uploadFile);
router.post('/email', ingestEmail);
router.get('/health-queue', listHealthQueue);

module.exports = router;
