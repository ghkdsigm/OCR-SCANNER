import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Body,
  BadRequestException,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { memoryStorage } from 'multer'
import { OcrService } from './ocr.service'
import { AnalyzeVehicleRegistrationDto } from './dto/analyze-vehicle-registration.dto'

@Controller('ocr')
export class OcrController {
  constructor(private readonly ocrService: OcrService) {}

  @Post('vehicle-registration/analyze')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
          cb(null, true)
        } else {
          cb(new BadRequestException('이미지(JPG/PNG/WEBP) 또는 PDF 파일만 업로드 가능합니다.'), false)
        }
      },
    }),
  )
  async analyze(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: AnalyzeVehicleRegistrationDto,
  ) {
    return this.ocrService.analyzeVehicleRegistration(file, dto.receiptId)
  }
}
