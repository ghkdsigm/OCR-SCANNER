import { Injectable, Logger } from '@nestjs/common'
import type { OcrProvider, VehicleRegistrationOcrResult } from './ocr-provider.interface'
import { VehicleRegistrationTextParser } from '../parsers/vehicle-registration-text.parser'

@Injectable()
export class GoogleVisionOcrProvider implements OcrProvider {
  private readonly logger = new Logger(GoogleVisionOcrProvider.name)

  async analyzeVehicleRegistration(file: Express.Multer.File): Promise<VehicleRegistrationOcrResult> {
    if (file.mimetype === 'application/pdf') {
      throw new Error('Google Vision OCR 재조회는 PDF를 지원하지 않습니다.')
    }

    const apiKey = process.env.GOOGLE_VISION_API_KEY
    if (!apiKey) throw new Error('GOOGLE_VISION_API_KEY 환경변수가 설정되지 않았습니다.')

    const base64 = file.buffer.toString('base64')

    const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{
          image: { content: base64 },
          features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
        }],
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Google Vision API 오류 (${response.status}): ${errorText}`)
    }

    const data = await response.json() as {
      responses?: Array<{
        error?: { message?: string }
        fullTextAnnotation?: { text?: string }
      }>
    }
    const visionError = data.responses?.[0]?.error?.message
    if (visionError) {
      throw new Error(`Google Vision OCR 오류: ${visionError}`)
    }

    const text = data.responses?.[0]?.fullTextAnnotation?.text ?? ''

    if (!text) {
      this.logger.warn('Google Vision OCR: 텍스트를 추출하지 못했습니다.')
    }

    this.logger.debug(`Google Vision 추출 텍스트 (앞 500자):\n${text.slice(0, 500)}`)
    return VehicleRegistrationTextParser.parse(text)
  }
}
