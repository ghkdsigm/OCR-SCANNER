import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Body,
  BadRequestException,
  Req,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { memoryStorage } from 'multer'
import type { Request } from 'express'
import { OcrService } from './ocr.service'
import { AnalyzeVehicleRegistrationDto } from './dto/analyze-vehicle-registration.dto'

const fileInterceptorOptions = {
  storage: memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req: unknown, file: Express.Multer.File, cb: (err: Error | null, accept: boolean) => void) => {
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true)
    } else {
      cb(new BadRequestException('이미지(JPG/PNG/WEBP) 또는 PDF 파일만 업로드 가능합니다.'), false)
    }
  },
}

@Controller('ocr')
export class OcrController {
  constructor(private readonly ocrService: OcrService) {}

  @Post('vehicle-registration/analyze')
  @UseInterceptors(FileInterceptor('image', fileInterceptorOptions))
  async analyze(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: AnalyzeVehicleRegistrationDto,
  ) {
    return this.ocrService.analyzeVehicleRegistration(file, dto.receiptId)
  }

  @Post('vehicle-registration/requery')
  @UseInterceptors(FileInterceptor('image', fileInterceptorOptions))
  async requery(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: AnalyzeVehicleRegistrationDto,
    @Req() req: Request,
  ) {
    const ip = this.getClientIp(req)
    return this.ocrService.requeryVehicleRegistration(file, dto.receiptId, ip)
  }

  private getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for']
    if (forwarded) {
      const ips = typeof forwarded === 'string' ? forwarded : forwarded[0]
      return ips.split(',')[0].trim()
    }
    return (req.socket as { remoteAddress?: string })?.remoteAddress ?? req.ip ?? 'unknown'
  }
}
