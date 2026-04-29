export interface VehicleRegistrationOcrResult {
  carNumber: string             // 자동차등록번호 (차량번호판)
  carType: string               // 차종
  purpose: string               // 용도
  carName: string               // 차명
  modelInfo: string             // 형식 및 모델연도(제작연월)
  vin: string                   // 차대번호
  engineType: string            // 원동기형식
  displacement: string          // 배기량 (cc)
  passengerCapacity: string     // 승차정원
  maxLoadCapacity: string       // 최대적재량
  fuelType: string              // 연료
  location: string              // 사용본거지
  ownerName: string             // 소유자 성명(명칭)
  firstRegistrationDate: string // 최초등록일
  inspectionValidity: string    // 검사유효기간 (최근 기간)
}

export interface OcrProvider {
  analyzeVehicleRegistration(file: Express.Multer.File): Promise<VehicleRegistrationOcrResult>
}

export const OCR_PROVIDER = Symbol('OCR_PROVIDER')
