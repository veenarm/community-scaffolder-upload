import { HttpAuthService, LoggerService } from '@backstage/backend-plugin-api';
import { InputError } from '@backstage/errors';
import { z } from 'zod';
import express from 'express';
import Router from 'express-promise-router';
import { TodoListService } from './services/TodoListService/types';
import { Config } from '@backstage/config';
import { S3 } from 'aws-sdk';
import busboy from 'busboy';

export async function createRouter({
  httpAuth,
  todoListService,
  config,
  logger,
}: {
  httpAuth: HttpAuthService;
  todoListService: TodoListService;
  config: Config;
  logger: LoggerService;
}): Promise<express.Router> {
  const router = Router();
  router.use(express.json());

  // TEMPLATE NOTE:
  // Zod is a powerful library for data validation and recommended in particular
  // for user-defined schemas. In this case we use it for input validation too.
  //
  // If you want to define a schema for your API we recommend using Backstage's
  // OpenAPI tooling: https://backstage.io/docs/next/openapi/01-getting-started
  const todoSchema = z.object({
    title: z.string(),
    entityRef: z.string().optional(),
  });

  router.post('/todos', async (req, res) => {
    const parsed = todoSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new InputError(parsed.error.toString());
    }

    const result = await todoListService.createTodo(parsed.data, {
      credentials: await httpAuth.credentials(req, { allow: ['user'] }),
    });

    res.status(201).json(result);
  });

  router.get('/todos', async (_req, res) => {
    res.json(await todoListService.listTodos());
  });

  router.get('/todos/:id', async (req, res) => {
    res.json(await todoListService.getTodo({ id: req.params.id }));
  });

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
