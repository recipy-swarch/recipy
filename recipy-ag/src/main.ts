import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { createProxyMiddleware } from 'http-proxy-middleware';
import * as bodyParser from 'body-parser';
import axios from 'axios';
import * as FormData from 'form-data';
import * as multer from 'multer';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const upload = multer({ storage: multer.memoryStorage() });

  // Proxy /user/* al servicio de usuarios (se quita el prefijo /user)
  app.use(
    '/user',
    createProxyMiddleware({
      target: process.env.USERAUTH_MS_URL,
      changeOrigin: true,
      pathRewrite: { '^/user': '' },
    }),
  );

  // Proxy /rpc/* al PostgREST
  app.use(
    '/rpc',
    createProxyMiddleware({
      target: process.env.PGRST_URL,
      changeOrigin: true,
      // No pathRewrite: dejamos /rpc/intacto
    }),
  );

  // Proxy /auth/* al servicio de autenticación (Flask)
  app.use(
    '/auth',
    createProxyMiddleware({
      target: process.env.USERAUTH_MS_URL,
      changeOrigin: true,
      pathRewrite: { '^/auth': '' , }, // quita el prefijo /auth
    }),
  );

  // Proxy /uploads/* al servicio de imagenes
  app.use(
    '/uploads',
    createProxyMiddleware({
      target: process.env.IMAGE_MS_URL,
      changeOrigin: true,
    }),
  );

  // ----------------------------------------------------------------------------
  // Para /recipe/graphql necesitamos preservar el body JSON completo,
  // porque Express ya se lo tragó antes de proxyar y el servicio de recetas
  // falla con un cuerpo vacío.
  // ----------------------------------------------------------------------------

  // 1. Parser raw para capturar el buffer crudo antes de que body-parser lo quite
  const jsonParser = bodyParser.json({
    verify: (req, _res, buf: Buffer) => {
      // guardamos el raw body en req.rawBody
      ;(req as any).rawBody = buf.toString();
    },
  });

  // 2. Middleware que llama a /me y guarda el id
  const addUserIdHeader = async (req: any, _res: any, next: any) => {
    try {
      const authHeader = req.headers['authorization'] || '';
      const xff = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || '';
      console.log('Authorization header:', authHeader);
      if (authHeader) {
        // Propaga el X-Forwarded-For original
        const { data } = await axios.get(
          `${process.env.USERAUTH_MS_URL}/me`,
          {
            headers: {
              Authorization: authHeader,
              'X-Forwarded-For': xff,
            }
          }
        );
        console.log('Response from /me:', data);
        req.userId = data.id;
      }
      return next();
    } catch (err) {
      console.warn('Error fetching user id:', err);
      return next();
    }
  };

  // 2. Middleware para extraer archivos multipart
  const processMultipartImages = async (req: any, _res: any, next: any) => {
    // soportar tanto upload.array(...) (req.files como array)
    // como upload.fields([{ name: 'images' }]) (req.files.images como array)
    const files: any[] = Array.isArray(req.files)
      ? (req.files as any[])
      : ((req.files as { images?: any[] })?.images || []);

    if (files.length) {
      console.log('Uploading images to image-ms (multipart):');
      const links = await Promise.all(
        files.map(async file => {
          const form = new FormData();
          form.append('image', file.buffer, file.originalname);
          form.append('type', 'recipe');
          form.append('id', req.userId ?? '0');
          
          const { data } = await axios.post(
            `${process.env.IMAGE_MS_URL}/Image/upload`,
            form,
            { headers: form.getHeaders() }
          );
          return data.link;
        })
      );
      // Reemplazo en el body para GraphQL
      req.body.images = links;
      req.rawBody = JSON.stringify(req.body);
    }
    next();
  };

  // 3. Pipeline para /recipe
  app.use(
    '/recipe',
    // Log the original request body and headers before any modification
    (req: any, _res: any, next: any) => {
      console.log('--- [RECIPE] Incoming request ---');
      console.log('Headers:', req.headers);
      console.log('Body:', req.body);
      next();
    },
    addUserIdHeader,               // <-- idem
    upload.fields([{ name: 'images', maxCount: 10 }]),  // declaras el campo exacto
    processMultipartImages,        // <-- sube a image-ms con multipart
    jsonParser,                    // <-- preservamos rawBody en JSON para el resto
    // Log the modified request body and headers after all modifications
    (req: any, _res: any, next: any) => {
      console.log('--- [RECIPE] Modified request ---');
      console.log('Headers:', req.headers);
      console.log('Body:', req.body);
      console.log('RawBody:', req.rawBody);
      next();
    },
    createProxyMiddleware({
      target: process.env.RECIPE_MS_URL,
      changeOrigin: true,
      pathRewrite: { '^/recipe': '' }, // quita el prefijo /recipe
      onProxyReq(proxyReq, req: any) {
        // 1) Preparamos todos los headers
        if (req.rawBody) {
          proxyReq.setHeader('Content-Type', 'application/json');
          proxyReq.setHeader('Content-Length', Buffer.byteLength(req.rawBody));
        }
        if (req.userId) {
          proxyReq.setHeader('id', req.userId); // inyectamos el id antes de escribir el body
        }

        // 2) Finalmente escribimos el body crudo
        if (req.rawBody) {
          proxyReq.write(req.rawBody);
        }
      },
    }),
  );

    // Proxy para el microservicio de correo (mail-ms)
  app.use(
    '/mail',
    createProxyMiddleware({
      target: process.env.MAIL_MS_URL,
      changeOrigin: true,
      pathRewrite: { '^/mail': '' }, // elimina /mail del path
    }),
  );

  await app.listen(3030);
  console.log('API Gateway escuchando en http://0.0.0.0:3030');
}

bootstrap();