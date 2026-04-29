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
Object.defineProperty(exports, "__esModule", { value: true });
exports.OcrService = void 0;
const common_1 = require("@nestjs/common");
const ocr_provider_interface_1 = require("./providers/ocr-provider.interface");
const ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'application/pdf',
];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
let OcrService = class OcrService {
    constructor(ocrProvider) {
        this.ocrProvider = ocrProvider;
    }
    async analyzeVehicleRegistration(file, receiptId) {
        this.validateFile(file);
        const mappedData = await this.ocrProvider.analyzeVehicleRegistration(file);
        return {
            receiptId,
            mappedData,
            confidence: 0.92,
            status: 'COMPLETED',
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
exports.OcrService = OcrService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(ocr_provider_interface_1.OCR_PROVIDER)),
    __metadata("design:paramtypes", [Object])
], OcrService);
//# sourceMappingURL=ocr.service.js.map