import type { OcrProvider, VehicleRegistrationOcrResult } from './ocr-provider.interface';
export declare class GoogleVisionOcrProvider implements OcrProvider {
    private readonly logger;
    analyzeVehicleRegistration(file: Express.Multer.File): Promise<VehicleRegistrationOcrResult>;
}
