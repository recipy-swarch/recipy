import { Controller, Get, Param, Res } from '@nestjs/common';
import { Response } from 'express';

@Controller('uploads')
export class ImagesController {
  @Get(':filename')
  redirectImage(@Param('filename') filename: string, @Res() res: Response) {
    const target = `${process.env.IMAGE_MS_URL}/uploads/${filename}`;
    return res.redirect(target);
  }
}
