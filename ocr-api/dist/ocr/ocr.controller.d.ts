import type { Request } from 'express';
import { OcrService } from './ocr.service';
import { AnalyzeVehicleRegistrationDto } from './dto/analyze-vehicle-registration.dto';
export declare class OcrController {
    private readonly ocrService;
    constructor(ocrService: OcrService);
    analyze(file: Express.Multer.File, dto: AnalyzeVehicleRegistrationDto): Promise<import("./dto/ocr-result.dto").OcrResultDto>;
    requery(file: Express.Multer.File, dto: AnalyzeVehicleRegistrationDto, req: Request): Promise<import("./dto/ocr-result.dto").OcrResultDto>;
    private getClientIp;
}
