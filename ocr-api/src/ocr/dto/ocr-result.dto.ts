import type { VehicleRegistrationOcrResult } from '../providers/ocr-provider.interface'

export class OcrResultDto {
  receiptId: string
  mappedData: VehicleRegistrationOcrResult
  confidence: number
  status: 'COMPLETED' | 'FAILED'
}
