"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var OcrService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OcrService = void 0;
const common_1 = require("@nestjs/common");
const ocr_provider_interface_1 = require("./providers/ocr-provider.interface");
const google_vision_ocr_provider_1 = require("./providers/google-vision-ocr.provider");
const ip_rate_limiter_service_1 = require("./services/ip-rate-limiter.service");
const ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'application/pdf',
];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
let OcrService = OcrService_1 = class OcrService {
    constructor(ocrProvider, googleVisionProvider, ipRateLimiter) {
        this.ocrProvider = ocrProvider;
        this.googleVisionProvider = googleVisionProvider;
        this.ipRateLimiter = ipRateLimiter;
        this.logger = new common_1.Logger(OcrService_1.name);
    }
    async analyzeVehicleRegistration(file, receiptId) {
        this.validateFile(file);
        const mappedData = await this.ocrProvider.analyzeVehicleRegistration(file);
        return {
            receiptId,
            mappedData,
            confidence: 0.92,
            status: 'COMPLETED',
            provider: 'default',
        };
    }
    async requeryVehicleRegistration(file, receiptId, ip) {
        this.validateFile(file);
        const usage = this.ipRateLimiter.registerRequeryAttempt(ip);
        const shouldUseGoogleVision = usage.useGoogleVision && file.mimetype !== 'application/pdf';
        const provider = shouldUseGoogleVision ? 'google-vision' : 'default';
        this.logger.log(`재조회 요청 - ip=${ip}, requeryAttempt=${usage.requeryAttemptNumber}, provider=${provider}`);
        const mappedData = shouldUseGoogleVision
            ? await this.googleVisionProvider.analyzeVehicleRegistration(file)
            : await this.ocrProvider.analyzeVehicleRegistration(file);
        return {
            receiptId,
            mappedData,
            confidence: 0.92,
            status: 'COMPLETED',
            provider,
        };
    }
    validateFile(file) {
        if (!file) {
            throw new common_1.BadRequestException('이미지 파일이 필요합니다.');
        }
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
            throw new common_1.BadRequestException(`지원하지 않는 파일 형식입니다. 허용: ${ALLOWED_MIME_TYPES.join(', ')}`);
        }
        if (file.size > MAX_FILE_SIZE_BYTES) {
            throw new common_1.BadRequestException('파일 크기는 10MB를 초과할 수 없습니다.');
        }
    }
};
exports.OcrService = OcrService;
exports.OcrService = OcrService = OcrService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(ocr_provider_interface_1.OCR_PROVIDER)),
    __metadata("design:paramtypes", [Object, google_vision_ocr_provider_1.GoogleVisionOcrProvider,
        ip_rate_limiter_service_1.IpRateLimiterService])
], OcrService);
//# sourceMappingURL=ocr.service.js.map