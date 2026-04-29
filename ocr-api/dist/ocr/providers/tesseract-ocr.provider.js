"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var TesseractOcrProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TesseractOcrProvider = void 0;
const common_1 = require("@nestjs/common");
const tesseract_js_1 = require("tesseract.js");
const sharp = require("sharp");
const vehicle_registration_text_parser_1 = require("../parsers/vehicle-registration-text.parser");
const pdfParse = require('pdf-parse');
const SEP = '[|｜:：]';
let TesseractOcrProvider = TesseractOcrProvider_1 = class TesseractOcrProvider {
    constructor() {
        this.logger = new common_1.Logger(TesseractOcrProvider_1.name);
        this.worker = null;
    }
    async onModuleInit() {
        this.logger.log('Tesseract worker 초기화 중 (kor+eng)…');
        this.worker = await (0, tesseract_js_1.createWorker)(['kor', 'eng'], tesseract_js_1.OEM.LSTM_ONLY, {
            logger: (m) => {
                if (m.status === 'loading tesseract core')
                    this.logger.log('Tesseract core 로딩 중…');
                if (m.status === 'initialized tesseract')
                    this.logger.log('Tesseract 초기화 완료');
                if (m.status === 'loading language traineddata')
                    this.logger.log('한국어 언어 데이터 로딩 중…');
            },
        });
        await this.worker.setParameters({ tessedit_pageseg_mode: tesseract_js_1.PSM.AUTO });
        this.logger.log('Tesseract worker 준비 완료');
    }
    async onModuleDestroy() {
        await this.worker?.terminate();
    }
    async analyzeVehicleRegistration(file) {
        if (file.mimetype === 'application/pdf')
            return this.analyzeFromPdf(file);
        return this.analyzeFromImage(file);
    }
    async analyzeFromImage(file) {
        const meta = await sharp(file.buffer).metadata();
        const h = meta.height ?? 1000;
        const w = meta.width ?? 800;
        const fullBuf = await this.preprocess(file.buffer);
        await this.setPsm(tesseract_js_1.PSM.AUTO);
        const fullText = await this.runOcr(fullBuf);
        const firstRegistrationText = await this.ocrFirstRegistrationRegion(file.buffer, w, h);
        const purposeText = await this.ocrPurposeRegion(file.buffer, w, h);
        const vinText = await this.ocrVinRegion(file.buffer, w, h);
        const upperSummaryText = await this.ocrUpperSummaryRegion(file.buffer, w, h);
        const specsText = await this.ocrSpecsRegion(file.buffer, w, h);
        const inspectionText = await this.ocrInspectionRegion(file.buffer, w, h);
        const lowerText = await this.ocrLowerRegion(file.buffer, w, h);
        const combined = [firstRegistrationText, purposeText, vinText, upperSummaryText, specsText, inspectionText, fullText, lowerText]
            .filter(Boolean)
            .join('\n\n');
        this.logger.debug(`[Pass2 최초등록일]\n${firstRegistrationText}`);
        this.logger.debug(`[Pass3 용도]\n${purposeText}`);
        this.logger.debug(`[Pass4 차대번호]\n${vinText}`);
        this.logger.debug(`[Pass5 상단 우측]\n${upperSummaryText}`);
        this.logger.debug(`[Pass6 제원표]\n${specsText}`);
        this.logger.debug(`[Pass7 검사표]\n${inspectionText}`);
        this.logger.debug(`[Pass1 전체]\n${fullText}`);
        this.logger.debug(`[Pass8 하단]\n${lowerText}`);
        return vehicle_registration_text_parser_1.VehicleRegistrationTextParser.parse(combined);
    }
    async ocrFirstRegistrationRegion(buffer, w, h) {
        return this.ocrRegion('최초등록일', buffer, {
            left: Math.floor(w * 0.62),
            top: Math.floor(h * 0.06),
            width: Math.floor(w * 0.32),
            height: Math.floor(h * 0.09),
        }, tesseract_js_1.PSM.SINGLE_BLOCK, 6.0);
    }
    async ocrPurposeRegion(buffer, w, h) {
        return this.ocrRegion('용도', buffer, {
            left: Math.floor(w * 0.84),
            top: Math.floor(h * 0.12),
            width: Math.floor(w * 0.12),
            height: Math.floor(h * 0.09),
        }, tesseract_js_1.PSM.SINGLE_BLOCK, 5.0);
    }
    async ocrVinRegion(buffer, w, h) {
        await this.worker?.setParameters({
            tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
        });
        try {
            return await this.ocrRegion('차대번호', buffer, {
                left: Math.floor(w * 0.03),
                top: Math.floor(h * 0.14),
                width: Math.floor(w * 0.56),
                height: Math.floor(h * 0.07),
            }, tesseract_js_1.PSM.SINGLE_LINE, 4.0);
        }
        finally {
            await this.worker?.setParameters({
                tessedit_char_whitelist: '',
            });
        }
    }
    async ocrUpperSummaryRegion(buffer, w, h) {
        return this.ocrRegion('상단 우측', buffer, {
            left: Math.floor(w * 0.46),
            top: Math.floor(h * 0.08),
            width: Math.floor(w * 0.50),
            height: Math.floor(h * 0.20),
        }, tesseract_js_1.PSM.SPARSE_TEXT, 2.8);
    }
    async ocrSpecsRegion(buffer, w, h) {
        return this.ocrRegion('제원표', buffer, {
            left: Math.floor(w * 0.01),
            top: Math.floor(h * 0.58),
            width: Math.floor(w * 0.54),
            height: Math.floor(h * 0.13),
        }, tesseract_js_1.PSM.SINGLE_BLOCK, 4.0);
    }
    async ocrInspectionRegion(buffer, w, h) {
        return this.ocrRegion('검사표', buffer, {
            left: Math.floor(w * 0.53),
            top: Math.floor(h * 0.58),
            width: Math.floor(w * 0.45),
            height: Math.floor(h * 0.13),
        }, tesseract_js_1.PSM.SINGLE_BLOCK, 4.0);
    }
    async ocrLowerRegion(buffer, w, h) {
        try {
            const cropTop = Math.floor(h * 0.60);
            const cropH = h - cropTop;
            const lowerBuf = await sharp(buffer)
                .extract({ left: 0, top: cropTop, width: w, height: cropH })
                .resize({ width: Math.min(w * 2, 3200) })
                .grayscale()
                .normalize()
                .sharpen({ sigma: 2.0 })
                .toBuffer();
            await this.setPsm(tesseract_js_1.PSM.SPARSE_TEXT);
            const text = await this.runOcr(lowerBuf);
            await this.setPsm(tesseract_js_1.PSM.AUTO);
            return text;
        }
        catch (err) {
            this.logger.warn(`하단 영역 OCR 실패: ${err.message}`);
            return '';
        }
    }
    async ocrRegion(label, buffer, rect, psm, scale = 2.0) {
        try {
            const regionBuf = await sharp(buffer)
                .extract(rect)
                .resize({ width: Math.min(Math.round(rect.width * scale), 3200) })
                .grayscale()
                .normalize()
                .threshold(160)
                .sharpen({ sigma: 2.2 })
                .toBuffer();
            await this.setPsm(psm);
            const text = await this.runOcr(regionBuf);
            await this.setPsm(tesseract_js_1.PSM.AUTO);
            return text;
        }
        catch (err) {
            this.logger.warn(`${label} OCR 실패: ${err.message}`);
            await this.setPsm(tesseract_js_1.PSM.AUTO);
            return '';
        }
    }
    async preprocess(buffer) {
        try {
            return await sharp(buffer)
                .grayscale()
                .normalize()
                .sharpen({ sigma: 1.5 })
                .toBuffer();
        }
        catch {
            return buffer;
        }
    }
    async setPsm(psm) {
        await this.worker?.setParameters({ tessedit_pageseg_mode: psm });
    }
    async runOcr(buffer) {
        if (!this.worker)
            throw new Error('Tesseract worker 미초기화');
        const { data: { text, confidence } } = await this.worker.recognize(buffer);
        this.logger.debug(`OCR 신뢰도: ${confidence?.toFixed(1)}%`);
        return text;
    }
    async analyzeFromPdf(file) {
        try {
            const data = await pdfParse(file.buffer);
            if ((data?.text ?? '').trim().length > 30) {
                this.logger.debug('텍스트 기반 PDF: 직접 파싱');
                return vehicle_registration_text_parser_1.VehicleRegistrationTextParser.parse(data.text);
            }
        }
        catch (err) {
            this.logger.warn(`pdf-parse 실패: ${err.message}`);
        }
        this.logger.warn('이미지 전용 PDF는 처리 불가 — 이미지로 재업로드 필요');
        return vehicle_registration_text_parser_1.VehicleRegistrationTextParser.empty();
    }
    parse(text) {
        const normalizedText = this.normalizeOcrText(text);
        const lines = normalizedText.split('\n').map((l) => l.trim()).filter(Boolean);
        return {
            carNumber: this.extractCarNumber(normalizedText),
            carType: this.extractCarType(normalizedText),
            purpose: this.extractPurpose(normalizedText),
            carName: this.extractCarName(normalizedText),
            modelInfo: this.extractModelInfo(normalizedText),
            vin: this.extractVin(normalizedText, lines),
            engineType: this.extractEngineType(normalizedText),
            displacement: this.extractDisplacement(normalizedText),
            passengerCapacity: this.extractPassengerCapacity(normalizedText),
            maxLoadCapacity: this.extractMaxLoad(normalizedText),
            fuelType: this.extractFuelType(normalizedText),
            location: this.extractLocation(normalizedText),
            ownerName: this.extractOwnerName(normalizedText),
            firstRegistrationDate: this.extractFirstDate(normalizedText),
            inspectionValidity: this.extractInspectionValidity(normalizedText),
        };
    }
    normalizeOcrText(text) {
        return text
            .replace(/\r/g, '')
            .replace(/\u0000/g, '')
            .replace(/[¦]/g, '|')
            .replace(/ㅣ/g, '|')
            .replace(/[“”]/g, '"')
            .replace(/[‘’`]/g, "'")
            .replace(/[·•]/g, ' ')
            .replace(/[ \t]+/g, ' ');
    }
    field(text, labelRe) {
        const pat = new RegExp(labelRe.source + `(?:\\s*${SEP}+|\\s{2,})\\s*([^|｜<\\n]{1,40})`);
        const m = text.match(pat);
        if (!m)
            return '';
        return m[1].trim()
            .replace(/\s{3,}.*$/, '')
            .replace(/['"'`]/g, '')
            .replace(/[.,。]$/, '')
            .trim();
    }
    extractCarNumber(text) {
        const fixed = text.replace(/\?(\d)/g, '7$1');
        for (const p of [
            /자동차\s*등록\s*[번빈]\s*호[^|｜:：\n]*[|｜:：][^\d가-힣\n]*(\d{1,3})\s*([가-힣])\s*(\d{4})/,
            /등록\s*[번빈]\s*호[^|｜:：\n]*[|｜:：][^\d가-힣\n]*(\d{1,3})\s*([가-힣])\s*(\d{4})/,
        ]) {
            const m = fixed.match(p);
            if (m)
                return `${m[1]}${m[2]}${m[3]}`;
        }
        for (const line of fixed.split('\n').map((value) => value.trim()).filter(Boolean)) {
            if (!/등록|번호|차량|자동차/.test(line))
                continue;
            const m = line.match(/(\d{2,3})\s*([가-힣])\s*(\d{4})/);
            if (m)
                return `${m[1]}${m[2]}${m[3]}`;
        }
        const m = fixed.match(/(?:^|[^\d])(\d{2,3})\s*([가-힣])\s*(\d{4})(?:[^\d]|$)/);
        if (m)
            return `${m[1]}${m[2]}${m[3]}`;
        return '';
    }
    extractCarType(text) {
        for (const p of [
            /차\s*[종중7](?:\s*[|｜:：]|\s{2,})\s*([가-힣]{1,10})/,
            /차\s*량?\s*종\s*류(?:\s*[|｜:：]|\s{2,})\s*([가-힣]{1,10})/,
        ]) {
            const m = text.match(p);
            if (m)
                return this.normalizeCarTypeValue(m[1]);
        }
        const types = [
            '중형승합', '소형승합', '대형승합', '경형승합',
            '중형승용', '소형승용', '대형승용', '경형승용',
            '승합', '승용', '화물', '특수',
        ];
        for (const t of types) {
            if (text.includes(t))
                return this.normalizeCarTypeValue(t);
        }
        return '';
    }
    normalizeCarTypeValue(value) {
        const cleaned = value.replace(/[^가-힣]/g, '').trim();
        if (!cleaned)
            return '';
        const exactTypes = [
            '중형승합', '소형승합', '대형승합', '경형승합',
            '중형승용', '소형승용', '대형승용', '경형승용',
            '승합', '승용', '화물', '특수',
        ];
        for (const type of exactTypes) {
            if (cleaned === type)
                return type;
        }
        if (cleaned.includes('승합')) {
            if (cleaned.includes('경형'))
                return '경형승합';
            if (cleaned.includes('소형'))
                return '소형승합';
            if (cleaned.includes('중형'))
                return '중형승합';
            if (cleaned.includes('대형'))
                return '대형승합';
            return '승합';
        }
        if (cleaned.includes('승용')) {
            if (cleaned.includes('경형'))
                return '경형승용';
            if (cleaned.includes('소형'))
                return '소형승용';
            if (cleaned.includes('중형'))
                return '중형승용';
            if (cleaned.includes('대형'))
                return '대형승용';
            return '승용';
        }
        if (cleaned.includes('화물'))
            return '화물';
        if (cleaned.includes('특수'))
            return '특수';
        return cleaned.slice(0, 10);
    }
    extractPurpose(text) {
        for (const p of [
            /용\s*도(?:\s*[|｜:：]|\s{2,})\s*([가-힣]{2,6})/,
            /용\s*[8도](?:\s*[|｜:：]|\s{2,})\s*([가-힣]{2,6})/,
        ]) {
            const m = text.match(p);
            if (m)
                return this.normalizePurposeValue(m[1]);
        }
        const purposes = ['자가용', '사가용', '영업용', '관용'];
        for (const p of purposes)
            if (text.includes(p))
                return this.normalizePurposeValue(p);
        return '';
    }
    normalizePurposeValue(value) {
        const cleaned = value.trim();
        if (cleaned === '사가용')
            return '자가용';
        return cleaned;
    }
    extractCarName(text) {
        for (const line of text.split('\n').map((value) => value.trim()).filter(Boolean)) {
            if (!/[©@]?\s*차(?:\s*명)?\s*[|｜:：]/.test(line))
                continue;
            const candidate = line
                .replace(/^.*[©@]?\s*차(?:\s*명)?\s*[|｜:：]?\s*/u, '')
                .replace(/\s+[<©@&].*$/, '')
                .replace(/\s+(?:[<©@&]\s*)?(?:형\s*식|형\s*식\s*및\s*모델\s*연\s*도|모델\s*연\s*도|차\s*대\s*번\s*호|원\s*동\s*기\s*형\s*식).*$/u, '')
                .replace(/\s*<\s*$/, '')
                .trim();
            if (candidate)
                return candidate;
        }
        const m = text.match(/[©@]?\s*차(?:\s*명)?\s*[|｜:：]+\s*([가-힣A-Za-z0-9][^|｜<\n]{1,30})/);
        if (m) {
            return m[1]
                .trim()
                .replace(/\s+[<©@&].*$/, '')
                .replace(/\s+(?:[<©@&]\s*)?(?:형\s*식|형\s*식\s*및\s*모델\s*연\s*도|모델\s*연\s*도|차\s*대\s*번\s*호|원\s*동\s*기\s*형\s*식).*$/u, '')
                .replace(/\s*<\s*$/, '')
                .replace(/\s{3,}.*$/, '')
                .trim();
        }
        return '';
    }
    extractModelInfo(text) {
        const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
        for (let i = 0; i < lines.length; i++) {
            const code = lines[i]
                .replace(/^[^A-Za-z0-9]+/, '')
                .replace(/[^A-Za-z0-9-]/g, '')
                .toUpperCase();
            const alphaCount = (code.match(/[A-Z]/g) ?? []).length;
            if (alphaCount < 3 || /^(19|20)\d{2}-/.test(code))
                continue;
            if (!/^[A-Z0-9]{2,}(?:-[A-Z0-9]{1,}){1,5}$/.test(code))
                continue;
            const nearby = [lines[i], lines[i + 1] ?? '', lines[i + 2] ?? ''].join(' ');
            const year = nearby.match(/\b(19\d{2}|20[0-3]\d)\b/)?.[1];
            if (year)
                return `${code} / ${year}`;
            return code;
        }
        for (const p of [
            /형\s*식(?:\s*및\s*모델\s*연\s*도)?\s*[|｜:：]?\s*([^\n]{4,50})/i,
            /모델\s*연\s*도\s*[|｜:：]?\s*([^\n]{4,50})/i,
        ]) {
            const m = text.match(p);
            if (!m)
                continue;
            const cleaned = m[1]
                .replace(/^[^A-Za-z0-9]+/, '')
                .replace(/[^A-Za-z0-9/ -]+/g, '')
                .replace(/\s{2,}/g, ' ')
                .trim();
            const code = cleaned.match(/[A-Z0-9]{2,}(?:-[A-Z0-9]{1,}){1,5}/i)?.[0]?.toUpperCase();
            const year = cleaned.match(/\b(19\d{2}|20[0-3]\d)\b/)?.[1];
            if (code && year)
                return `${code} / ${year}`;
            if (cleaned.length >= 4)
                return cleaned;
        }
        return '';
    }
    extractEngineType(text) {
        for (const candidate of [
            this.field(text, /원\s*동\s*기\s*형\s*식/),
            text.match(/원\s*동\s*기\s*형\s*식[^\n]{0,20}([A-Z0-9-]{3,12})/i)?.[1] ?? '',
        ]) {
            const cleaned = candidate.toUpperCase().replace(/[^A-Z0-9-]/g, '');
            if (/^[A-Z0-9-]{3,12}$/.test(cleaned) && /[A-Z]/.test(cleaned) && /\d/.test(cleaned)) {
                return cleaned;
            }
        }
        for (const line of text.split('\n').map((value) => value.trim()).filter(Boolean)) {
            const cleaned = line.toUpperCase().replace(/[^A-Z0-9-]/g, '');
            if (/^[A-Z]\d[A-Z0-9]{2,5}$/.test(cleaned))
                return cleaned;
        }
        return '';
    }
    extractVin(text, lines) {
        for (const p of [
            /차\s*대\s*번\s*호\s*[|｜:：]\s*([A-Z0-9]{10,17})/i,
            /대\s*번\s*호\s*[|｜:：]\s*([A-Z0-9]{10,17})/i,
        ]) {
            const m = text.match(p);
            if (m)
                return m[1].toUpperCase();
        }
        for (let i = 0; i < lines.length; i++) {
            if (/대\s*번\s*호/.test(lines[i])) {
                const after = lines[i].split(/[|｜:：]/).slice(1).join('').trim();
                const vm = after.match(/([A-Z0-9]{10,17})/i);
                if (vm)
                    return vm[1].toUpperCase();
                const next = lines[i + 1];
                if (next) {
                    const vm2 = next.match(/([A-Z0-9]{10,17})/i);
                    if (vm2)
                        return vm2[1].toUpperCase();
                }
            }
        }
        const m = text.match(/\b([A-HJ-NPR-Z0-9]{17})\b/i);
        return m ? m[1].toUpperCase() : '';
    }
    extractDisplacement(text) {
        const m = text.match(/배\s*기\s*량\s*[|｜:：]?\s*(\d[\d,]+)\s*c{0,2}/i);
        if (m)
            return m[1].replace(/,/g, '');
        const m2 = text.match(/(\d{3,5})\s*cc/i);
        return m2 ? m2[1] : '';
    }
    extractPassengerCapacity(text) {
        const m = text.match(/[승숭]\s*차\s*정\s*원(?:\s*[|｜:：]|\s{2,})\s*(\d{1,2})(?:\s*명)?/);
        if (m)
            return m[1];
        const m2 = text.match(/[승숭]\s*차\s*정\s*원[^\n]{0,12}?(\d{1,2})\s*명/);
        return m2 ? m2[1] : '';
    }
    extractMaxLoad(text) {
        const m = text.match(/최\s*대\s*적\s*재\s*량\s*[|｜:：]?\s*(\d[\d,]*)\s*k?g?/i);
        if (m)
            return m[1].replace(/,/g, '');
        const m2 = text.match(/최\s*대\s*적\s*재\s*량[^\n]*?(\d[\d,]+)\s*kg/i);
        return m2 ? m2[1].replace(/,/g, '') : '';
    }
    extractFuelType(text) {
        const labeled = text.match(/(?:연\s*료\s*의?\s*종\s*류|사\s*용\s*연\s*료)\s*[|｜:：]?\s*([가-힣A-Za-z]{2,10})/);
        if (labeled)
            return labeled[1].trim();
        const fuels = ['가솔린', '휘발유', '디젤', '경유', 'LPG', '하이브리드', 'CNG'];
        for (const f of fuels) {
            if (text.includes(f))
                return f;
        }
        return '';
    }
    extractLocation(text) {
        const m = text.match(/사\s*용\s*본\s*거\s*지\s*[|｜:：]\s*([^\n]{5,60})/);
        if (m)
            return m[1].trim().replace(/['"'`]/g, '').replace(/\s{3,}.*$/, '').trim();
        return '';
    }
    extractOwnerName(text) {
        const corporate = text.match(/\(주\)\s*[가-힣A-Za-z0-9]{2,20}/);
        if (corporate)
            return corporate[0];
        for (const line of text.split('\n').map((value) => value.trim()).filter(Boolean)) {
            if (!/성\s*명|소\s*유\s*자/.test(line))
                continue;
            const candidate = line
                .replace(/^.*성\s*명[^|｜:：]*[|｜:：]?\s*/u, '')
                .replace(/^.*소\s*유\s*자[^|｜:：]*[|｜:：]?\s*/u, '')
                .replace(/\*.*$/, '')
                .replace(/\[.*?\]/g, '')
                .replace(/[~\])>]+.*$/, '')
                .replace(/[^()가-힣A-Za-z0-9\s]/g, ' ')
                .replace(/\s{2,}/g, ' ')
                .trim();
            if (candidate.length >= 3 && candidate !== '(주)')
                return candidate;
        }
        const m = text.match(/성\s*명[^|｜:：\n]*[|｜:：]+\s*([^\n|｜]{2,40})/);
        if (m) {
            const v = m[1].trim()
                .replace(/\*.*$/, '')
                .replace(/\*[^*]*\*?/g, '')
                .replace(/\[.*?\]/g, '')
                .replace(/[~\])>]+.*$/, '')
                .replace(/\s{3,}.*$/, '')
                .trim();
            if (v.length >= 3 && v !== '(주)')
                return v;
        }
        const m2 = text.match(/소\s*유\s*자[^|｜:：\n]*[|｜:：]\s*([^\n|｜]{2,30})/);
        if (m2)
            return m2[1].trim().replace(/\s{3,}.*$/, '').trim();
        return '';
    }
    extractFirstDate(text) {
        const labeled = text.match(/최\s*초\s*등\s*록\s*일[^\d]{0,20}(19\d{2}|20[0-3]\d)\D{0,4}(\d{1,2})\D{0,4}(\d{1,2})/);
        if (labeled)
            return `${labeled[1]}-${labeled[2].padStart(2, '0')}-${labeled[3].padStart(2, '0')}`;
        const head = text.split('\n').slice(0, 20).join(' ');
        const m = head.match(/\b(19\d{2}|20[0-3]\d)\D{0,4}(\d{1,2})\D{0,4}(\d{1,2})\s*일?/);
        if (m)
            return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
        return '';
    }
    extractInspectionValidity(text) {
        const dateRe = /(\d{4}[-./=]\d{1,2}[-./=]\d{1,2})\s*(\d{4}[-./=]\d{1,2}[-./=]\d{1,2})/g;
        const all = [...text.matchAll(dateRe)];
        if (all.length === 0)
            return '';
        const last = all[all.length - 1];
        const from = this.normalizeDateString(last[1]);
        const to = this.normalizeDateString(last[2]);
        const afterDate = text.slice(last.index + last[0].length, last.index + last[0].length + 40);
        const typeMatch = afterDate.match(/[종정][합기]\s*검사/);
        const inspType = typeMatch ? typeMatch[0].replace(/\s/g, '') : '';
        return inspType ? `${from} ~ ${to} (${inspType})` : `${from} ~ ${to}`;
    }
    normalizeDateString(value) {
        const m = value.match(/(\d{4})[-./=](\d{1,2})[-./=](\d{1,2})/);
        if (!m)
            return value.replace(/[.=]/g, '-');
        return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
    }
    empty() {
        return {
            carNumber: '', carType: '', purpose: '', carName: '', modelInfo: '',
            vin: '', engineType: '', displacement: '', passengerCapacity: '',
            maxLoadCapacity: '', fuelType: '', location: '', ownerName: '',
            firstRegistrationDate: '', inspectionValidity: '',
        };
    }
};
exports.TesseractOcrProvider = TesseractOcrProvider;
exports.TesseractOcrProvider = TesseractOcrProvider = TesseractOcrProvider_1 = __decorate([
    (0, common_1.Injectable)()
], TesseractOcrProvider);
//# sourceMappingURL=tesseract-ocr.provider.js.map