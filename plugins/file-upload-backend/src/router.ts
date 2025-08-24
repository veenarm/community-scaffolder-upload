import { LoggerService } from '@backstage/backend-plugin-api';
import express from 'express';
import Router from 'express-promise-router';
import { Config } from '@backstage/config';
import { S3 } from 'aws-sdk';
import busboy from 'busboy';

export async function createRouter({
  config,
  logger,
}: {
  config: Config;
  logger: LoggerService;
}): Promise<express.Router> {
  const router = Router();
  router.use(express.json());

  router.post('/files/upload', async (req, res) => {
    const s3 = new S3({
      accessKeyId: config.getString('aws.accessKeyId'),
      secretAccessKey: config.getString('aws.secretAccessKey'),
      region: config.getString('aws.region'),
    });

    const bb = busboy({ headers: req.headers });
    req.pipe(bb);

    bb.on('file', (fieldname, file, filename) => {
      logger.info(`Uploading file ${filename.filename} to S3`);
      const params = {
        Bucket: config.getString('aws.s3.bucket'),
        Key: `${Date.now()}_${filename.filename}`,
        Body: file,
      };

      s3.upload(params, (err: Error, data: S3.ManagedUpload.SendData) => {
        if (err) {
          logger.error(`Failed to upload file to S3: ${err.message}`);
          res.status(500).json({ error: err.message });
          return;
        }
        logger.info(`File uploaded successfully to ${data.Location}`);
        res.status(201).json({ path: data.Location });
      });
    });
  });


  return router;
}
