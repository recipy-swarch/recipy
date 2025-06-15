import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { createProxyMiddleware } from 'http-proxy-middleware';
import * as bodyParser from 'body-parser';
import axios from 'axios';                      // <-- nuevo
import * as FormData from 'form-data';

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
      console.log('Authorization header:', authHeader);
      if (authHeader) {
        // sólo llamamos a /me si hay token
        const { data } = await axios.get(
          `${process.env.USERAUTH_MS_URL}/me`,
          { headers: { Authorization: authHeader } }
        );
        console.log('Response from /me:', data);
        req.userId = data.id;
      }
      // si no hay authHeader dejamos userId indefinido y continuamos
      return next();
    } catch (err) {
      // loguear y continuar sin userId si falla la llamada
      console.warn('Error fetching user id:', err);
      return next();
    }
  };

  // 3.1. Middleware que sube imágenes a Image y reemplaza el array en el body
 const processImages = async (req: any, _res: any, next: any) => {
   try {
     if (req.body?.images && Array.isArray(req.body.images)) {
       console.log('Uploading images to image-ms:', req.body.images);
       const links = await Promise.all(
         req.body.images.map(async (img: string, idx: number) => {
           const form = new FormData()
           const buffer = Buffer.from(img, 'base64')
           // TODO: Nos va a tocar cambiar esto, porque siempre es png, además que siendo un base64, nos limitamos a archivos pequeños
           form.append('image', buffer, { filename: `${idx + 1}.png` })
           form.append('type', 'recipe')
           form.append('id', req.userId ?? '0')

           const { data } = await axios.post(
             `${process.env.IMAGE_MS_URL}/Image/upload`,
             form,
             { headers: form.getHeaders() }
           );
           console.log('image-ms response:', data);
           return data.link;
         })
       );
       req.body.images = links;
       console.log('Updated images in body:', req.body.images);
       req.rawBody = JSON.stringify(req.body);
       console.log('Updated raw body:', req.rawBody);
     }
     next();
   } catch (err) {
     next(err);
   }
 };


  // 3. Proxy específico para GraphQL de recetas
  app.use(
    '/recipe',
    // Log the original request body and headers before any modification
    (req: any, _res: any, next: any) => {
      console.log('--- [RECIPE] Incoming request ---');
      console.log('Headers:', req.headers);
      console.log('Body:', req.body);
      next();
    },
    addUserIdHeader,  // <-- primero obtenemos el id
    jsonParser,       // <-- luego el raw body
    processImages,    // <-- subimos imágenes y actualizamos req.rawBody
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