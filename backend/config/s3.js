const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');

// Check if S3 credentials exist in environment
const hasS3Config = process.env.AWS_ACCESS_KEY_ID && 
                      process.env.AWS_SECRET_ACCESS_KEY && 
                      process.env.AWS_S3_BUCKET && 
                      process.env.AWS_REGION;

let s3Client = null;

if (hasS3Config) {
  s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
  });
  console.log("AWS S3 integration initialized");
} else {
  console.log("AWS S3 config missing, using local uploads fallback");
}

const uploadCoverPhoto = async (file, hostUrl) => {
  const fileExtension = path.extname(file.originalname) || '.jpg';
  const filename = `${uuidv4()}${fileExtension}`;

  if (hasS3Config) {
    try {
      const bucketName = process.env.AWS_S3_BUCKET;
      const key = `covers/${filename}`;

      await s3Client.send(new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }));

      // Return AWS S3 Public URL
      return `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    } catch (err) {
      console.error("Failed to upload to S3, falling back to local storage:", err);
      // Fall through to local storage if S3 upload fails
    }
  }

  // Local storage fallback
  const uploadDir = path.join(__dirname, '../uploads');
  
  // Ensure uploads directory exists
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const filePath = path.join(uploadDir, filename);
  fs.writeFileSync(filePath, file.buffer);

  const baseUrl = hostUrl || process.env.API_URL || 'http://localhost:3000';
  return `${baseUrl}/uploads/${filename}`;
};

module.exports = {
  uploadCoverPhoto
};
