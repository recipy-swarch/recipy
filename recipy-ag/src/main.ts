import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { createProxyMiddleware } from 'http-proxy-middleware';
import * as bodyParser from 'body-parser';
import axios from 'axios';                      // <-- nuevo

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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
      const auth = req.headers['authorization'];
      const { data } = await axios.get(
        `${process.env.USERAUTH_MS_URL}/me`,
        { headers: { authorization: auth } }
      );
      req.userId = data.id;
      next();
    } catch (err) {
      next(err);
    }
  };

  // 3.1. Middleware que sube imágenes a Imgur y reemplaza el array en el body
  const processImages = async (req: any, _res: any, next: any) => {
    try {
      if (req.body?.images && Array.isArray(req.body.images)) {
        const links = await Promise.all(
          req.body.images.map(async (img: string) => {
            const { data } = await axios.post(
              `${process.env.IMGUR_API_URL}/imgur/upload`,
              { image: img }
            );
            return data.data.link;
          })
        );
        req.body.images = links;
        req.rawBody = JSON.stringify(req.body);
      }
      next();
    } catch (err) {
      next(err);
    }
  };

  // 3. Proxy específico para GraphQL de recetas
  app.use(
    '/recipe/graphql',
    addUserIdHeader,  // <-- primero obtenemos el id
    jsonParser,       // <-- luego el raw body
    processImages,    // <-- subimos imágenes y actualizamos req.rawBody
    createProxyMiddleware({
      target: process.env.RECIPE_MS_URL,
      changeOrigin: true,
      //pathRewrite: { '^/recipe': '' }, // quita el prefijo /recipe
      onProxyReq(proxyReq, req: any) {
        if (req.rawBody) {
          // reescribimos el body tal cual lo recibimos
          proxyReq.setHeader('Content-Type', 'application/json');
          proxyReq.setHeader('Content-Length', Buffer.byteLength(req.rawBody));
          proxyReq.write(req.rawBody);
        }
        if (req.userId) {
          proxyReq.setHeader('id', req.userId); // <-- inyectamos el id
        }
      },
    }),
  );

  await app.listen(3030);
  console.log('API Gateway escuchando en http://0.0.0.0:3030');
}

bootstrap();