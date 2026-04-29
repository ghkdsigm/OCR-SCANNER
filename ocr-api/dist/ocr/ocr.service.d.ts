import type { OcrProvider } from './providers/ocr-provider.interface';
import type { OcrResultDto } from './dto/ocr-result.dto';
import { GoogleVisionOcrProvider } from './providers/google-vision-ocr.provider';
import { IpRateLimiterService } from './services/ip-rate-limiter.service';
export declare class OcrService {
    private readonly ocrProvider;
    private readonly googleVisionProvider;
    private readonly ipRateLimiter;
    private readonly logger;
    constructor(ocrProvider: OcrProvider, googleVisionProvider: GoogleVisionOcrProvider, ipRateLimiter: IpRateLimiterService);
    analyzeVehicleRegistration(file: Express.Multer.File, receiptId: string): Promise<OcrResultDto>;
    requeryVehicleRegistration(file: Express.Multer.File, receiptId: string, ip: string): Promise<OcrResultDto>;
    private validateFile;
}
