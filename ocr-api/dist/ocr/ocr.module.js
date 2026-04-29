"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OcrModule = void 0;
const common_1 = require("@nestjs/common");
const ocr_controller_1 = require("./ocr.controller");
const ocr_service_1 = require("./ocr.service");
const tesseract_ocr_provider_1 = require("./providers/tesseract-ocr.provider");
const google_vision_ocr_provider_1 = require("./providers/google-vision-ocr.provider");
const ip_rate_limiter_service_1 = require("./services/ip-rate-limiter.service");
const ocr_provider_interface_1 = require("./providers/ocr-provider.interface");
let OcrModule = class OcrModule {
};
exports.OcrModule = OcrModule;
exports.OcrModule = OcrModule = __decorate([
    (0, common_1.Module)({
        controllers: [ocr_controller_1.OcrController],
        providers: [
            ocr_service_1.OcrService,
            {
                provide: ocr_provider_interface_1.OCR_PROVIDER,
                useClass: tesseract_ocr_provider_1.TesseractOcrProvider,
            },
            google_vision_ocr_provider_1.GoogleVisionOcrProvider,
            ip_rate_limiter_service_1.IpRateLimiterService,
        ],
    })
], OcrModule);
//# sourceMappingURL=ocr.module.js.map