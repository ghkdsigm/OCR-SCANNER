"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var GoogleVisionOcrProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleVisionOcrProvider = void 0;
const common_1 = require("@nestjs/common");
const vehicle_registration_text_parser_1 = require("../parsers/vehicle-registration-text.parser");
let GoogleVisionOcrProvider = GoogleVisionOcrProvider_1 = class GoogleVisionOcrProvider {
    constructor() {
        this.logger = new common_1.Logger(GoogleVisionOcrProvider_1.name);
    }
    async analyzeVehicleRegistration(file) {
        if (file.mimetype === 'application/pdf') {
            throw new Error('Google Vision OCR 재조회는 PDF를 지원하지 않습니다.');
        }
        const apiKey = process.env.GOOGLE_VISION_API_KEY;
        if (!apiKey)
            throw new Error('GOOGLE_VISION_API_KEY 환경변수가 설정되지 않았습니다.');
        const base64 = file.buffer.toString('base64');
        const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                requests: [{
                        image: { content: base64 },
                        features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
                    }],
            }),
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Google Vision API 오류 (${response.status}): ${errorText}`);
        }
        const data = await response.json();
        const visionError = data.responses?.[0]?.error?.message;
        if (visionError) {
            throw new Error(`Google Vision OCR 오류: ${visionError}`);
        }
        const text = data.responses?.[0]?.fullTextAnnotation?.text ?? '';
        if (!text) {
            this.logger.warn('Google Vision OCR: 텍스트를 추출하지 못했습니다.');
        }
        this.logger.debug(`Google Vision 추출 텍스트 (앞 500자):\n${text.slice(0, 500)}`);
        return vehicle_registration_text_parser_1.VehicleRegistrationTextParser.parse(text);
    }
};
exports.GoogleVisionOcrProvider = GoogleVisionOcrProvider;
exports.GoogleVisionOcrProvider = GoogleVisionOcrProvider = GoogleVisionOcrProvider_1 = __decorate([
    (0, common_1.Injectable)()
], GoogleVisionOcrProvider);
//# sourceMappingURL=google-vision-ocr.provider.js.map