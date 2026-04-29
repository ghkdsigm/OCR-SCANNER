import { Module } from '@nestjs/common'
import { OcrController } from './ocr.controller'
import { OcrService } from './ocr.service'
import { TesseractOcrProvider } from './providers/tesseract-ocr.provider'
import { GoogleVisionOcrProvider } from './providers/google-vision-ocr.provider'
import { IpRateLimiterService } from './services/ip-rate-limiter.service'
import { OCR_PROVIDER } from './providers/ocr-provider.interface'

@Module({
  controllers: [OcrController],
  providers: [
    OcrService,
    {
      provide: OCR_PROVIDER,
      useClass: TesseractOcrProvider,
    },
    GoogleVisionOcrProvider,
    IpRateLimiterService,
  ],
})
export class OcrModule {}
