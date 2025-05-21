import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { createProxyMiddleware } from 'http-proxy-middleware';

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

  // Proxy /recipe/* al servicio de recetas (se quita el prefijo /recipe)
  app.use(
    '/recipe',
    createProxyMiddleware({
      target: process.env.RECIPE_MS_URL,
      changeOrigin: true,
      pathRewrite: { '^/recipe': '' },
    }),
  );

  // Proxy /rpc/* al PostgREST
  app.use(
    '/rpc',
    createProxyMiddleware({
      target: process.env.POSTGREST_URL,
      changeOrigin: true,
      // No pathRewrite: dejamos /rpc/intacto
      pathRewrite: {
        '^/rcp': '', // quita el prefijo /auth a la URL que llega al microservicio 
      },
    }),
  );

  // Proxy /auth/* al servicio de autenticación (Flask) 
  app.use(
    '/auth',
    createProxyMiddleware({
      target: process.env.USERAUTH_MS_URL,
      changeOrigin: true,
      pathRewrite: {
        '^/auth': '', // quita el prefijo /auth a la URL que llega al microservicio 
      },
    }),
  );

  await app.listen(3030);
  console.log('API Gateway escuchando en http://0.0.0.0:3030');
}

bootstrap();
