import type { VehicleRegistrationOcrResult } from '../providers/ocr-provider.interface';
export declare class OcrResultDto {
    receiptId: string;
    mappedData: VehicleRegistrationOcrResult;
    confidence: number;
    status: 'COMPLETED' | 'FAILED';
    provider: 'default' | 'google-vision';
}
