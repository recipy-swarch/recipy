import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { createProxyMiddleware } from 'http-proxy-middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Proxy /user/* al servicio de usuarios
  app.use(
    '/user',
    createProxyMiddleware({
      target: 'http://127.0.0.1:5000',
      changeOrigin: true,
      pathRewrite: { '^/user': '/user' },
    }),
  );

  // Proxy /recipe/* al servicio de recetas
  app.use(
    '/recipe',
    createProxyMiddleware({
      target: 'http://127.0.0.1:8000',
      changeOrigin: true,
      pathRewrite: { '^/recipe': '/recipe' },
    }),
  );

  await app.listen(3030);
  console.log('API Gateway escuchando en http://0.0.0.0:3030');
}
bootstrap();