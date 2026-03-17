const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const multer    = require('multer');
const multerS3  = require('multer-s3');
const path      = require('path');

const s3 = new S3Client({
  region:      process.env.AWS_REGION      || 'us-east-1',
  credentials: {
    accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
});

// Allowed file types
const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain'
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Multer + S3 upload config
const upload = multer({
  storage: multerS3({
    s3,
    bucket: process.env.AWS_S3_BUCKET,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (req, file, cb) => {
      const ext      = path.extname(file.originalname);
      const filename = `taskflow/tasks/${req.params.id}/${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
      cb(null, filename);
    }
  }),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed. Allowed: images, PDF, Word, text`), false);
    }
  }
});

// Delete a file from S3 by its key
const deleteFile = async (fileUrl) => {
  try {
    const url = new URL(fileUrl);
    const key = url.pathname.slice(1); // remove leading /
    await s3.send(new DeleteObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key:    key
    }));
  } catch (err) {
    console.error('S3 delete error:', err.message);
  }
};

module.exports = { upload, deleteFile };
