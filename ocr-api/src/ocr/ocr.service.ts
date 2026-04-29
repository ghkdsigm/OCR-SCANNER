import { Inject, Injectable, BadRequestException } from '@nestjs/common'
import { OCR_PROVIDER } from './providers/ocr-provider.interface'
import type { OcrProvider } from './providers/ocr-provider.interface'
import type { OcrResultDto } from './dto/ocr-result.dto'

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/pdf',
]
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB

@Injectable()
export class OcrService {
  constructor(@Inject(OCR_PROVIDER) private readonly ocrProvider: OcrProvider) {}

  async analyzeVehicleRegistration(
    file: Express.Multer.File,
    receiptId: string,
  ): Promise<OcrResultDto> {
    this.validateFile(file)

    const mappedData = await this.ocrProvider.analyzeVehicleRegistration(file)

    return {
      receiptId,
      mappedData,
      confidence: 0.92,
      status: 'COMPLETED',
    }
  }

  private validateFile(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('이미지 파일이 필요합니다.')
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `지원하지 않는 파일 형식입니다. 허용: ${ALLOWED_MIME_TYPES.join(', ')}`,
      )
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException('파일 크기는 10MB를 초과할 수 없습니다.')
    }
  }
}
