import { Body, Controller, Get, Param, Post } from '@nestjs/common'
import { OcrResultService } from './ocr-result.service'
import { CreateOcrResultDto } from './dto/create-ocr-result.dto'

@Controller('external/ocr-result')
export class OcrResultController {
  constructor(private readonly ocrResultService: OcrResultService) {}

  @Post()
  create(@Body() dto: CreateOcrResultDto) {
    return this.ocrResultService.create(dto)
  }

  @Get(':receiptId')
  findOne(@Param('receiptId') receiptId: string) {
    return this.ocrResultService.findByReceiptId(receiptId)
  }
}
