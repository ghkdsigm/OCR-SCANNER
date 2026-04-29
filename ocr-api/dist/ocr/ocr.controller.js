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
exports.OcrController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const ocr_service_1 = require("./ocr.service");
const analyze_vehicle_registration_dto_1 = require("./dto/analyze-vehicle-registration.dto");
const fileInterceptorOptions = {
    storage: (0, multer_1.memoryStorage)(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
            cb(null, true);
        }
        else {
            cb(new common_1.BadRequestException('이미지(JPG/PNG/WEBP) 또는 PDF 파일만 업로드 가능합니다.'), false);
        }
    },
};
let OcrController = class OcrController {
    constructor(ocrService) {
        this.ocrService = ocrService;
    }
    async analyze(file, dto) {
        return this.ocrService.analyzeVehicleRegistration(file, dto.receiptId);
    }
    async requery(file, dto, req) {
        const ip = this.getClientIp(req);
        return this.ocrService.requeryVehicleRegistration(file, dto.receiptId, ip);
    }
    getClientIp(req) {
        const forwarded = req.headers['x-forwarded-for'];
        if (forwarded) {
            const ips = typeof forwarded === 'string' ? forwarded : forwarded[0];
            return ips.split(',')[0].trim();
        }
        return req.socket?.remoteAddress ?? req.ip ?? 'unknown';
    }
};
exports.OcrController = OcrController;
__decorate([
    (0, common_1.Post)('vehicle-registration/analyze'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('image', fileInterceptorOptions)),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, analyze_vehicle_registration_dto_1.AnalyzeVehicleRegistrationDto]),
    __metadata("design:returntype", Promise)
], OcrController.prototype, "analyze", null);
__decorate([
    (0, common_1.Post)('vehicle-registration/requery'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('image', fileInterceptorOptions)),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, analyze_vehicle_registration_dto_1.AnalyzeVehicleRegistrationDto, Object]),
    __metadata("design:returntype", Promise)
], OcrController.prototype, "requery", null);
exports.OcrController = OcrController = __decorate([
    (0, common_1.Controller)('ocr'),
    __metadata("design:paramtypes", [ocr_service_1.OcrService])
], OcrController);
//# sourceMappingURL=ocr.controller.js.map