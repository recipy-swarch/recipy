import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { createProxyMiddleware } from 'http-proxy-middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Proxy /user/* al servicio de usuarios (se quita el prefijo /user)
  app.use(
    '/user',
    createProxyMiddleware({
      target: process.env.USERAUTH_MS_URL || 'http://userauth-ms:5000',
      changeOrigin: true,
      pathRewrite: { '^/user': '' },
    }),
  );

  // Proxy /recipe/* al servicio de recetas (se quita el prefijo /recipe)
  app.use(
    '/recipe',
    createProxyMiddleware({
      target: process.env.RECIPE_MS_URL || 'http://recipe-ms:8000',
      changeOrigin: true,
      pathRewrite: { '^/recipe': '' },
    }),
  );

  // Proxy /rpc/* al PostgREST
app.use(
  '/rpc',
  createProxyMiddleware({
    target: process.env.POSTGREST_URL || 'http://userauth-postgrest:3000',
    changeOrigin: true,
    // No pathRewrite: dejamos /rpc/intacto
  }),
);

  await app.listen(3030);
  console.log('API Gateway escuchando en http://0.0.0.0:3030');
}

bootstrap();
