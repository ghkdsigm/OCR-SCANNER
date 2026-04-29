import { Module } from '@nestjs/common'
import { OcrResultController } from './ocr-result.controller'
import { OcrResultService } from './ocr-result.service'

@Module({
  controllers: [OcrResultController],
  providers: [OcrResultService],
})
export class OcrResultModule {}
