import { Module } from '@nestjs/common'
import { ScheduleModule } from '@nestjs/schedule'
import { OcrResultModule } from './ocr-result/ocr-result.module'

@Module({
  imports: [ScheduleModule.forRoot(), OcrResultModule],
})
export class AppModule {}
