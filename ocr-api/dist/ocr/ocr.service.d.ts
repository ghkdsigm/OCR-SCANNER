import type { OcrProvider } from './providers/ocr-provider.interface';
import type { OcrResultDto } from './dto/ocr-result.dto';
export declare class OcrService {
    private readonly ocrProvider;
    constructor(ocrProvider: OcrProvider);
    analyzeVehicleRegistration(file: Express.Multer.File, receiptId: string): Promise<OcrResultDto>;
    private validateFile;
}
