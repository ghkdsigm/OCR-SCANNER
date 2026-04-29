import { Module } from '@nestjs/common'
import { OcrController } from './ocr.controller'
import { OcrService } from './ocr.service'
import { TesseractOcrProvider } from './providers/tesseract-ocr.provider'
import { OCR_PROVIDER } from './providers/ocr-provider.interface'

@Module({
  controllers: [OcrController],
  providers: [
    OcrService,
    {
      provide: OCR_PROVIDER,
      useClass: TesseractOcrProvider,
    },
  ],
})
export class OcrModule {}
