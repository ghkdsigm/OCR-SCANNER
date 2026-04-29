"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VehicleRegistrationTextParser = void 0;
class VehicleRegistrationTextParser {
    static parse(text) {
        const normalizedText = this.normalizeOcrText(text);
        const lines = normalizedText.split('\n').map((line) => line.trim()).filter(Boolean);
        return {
            carNumber: this.extractCarNumber(normalizedText, lines),
            carType: this.extractCarType(normalizedText),
            purpose: this.extractPurpose(normalizedText),
            carName: this.extractCarName(normalizedText, lines),
            modelInfo: this.extractModelInfo(normalizedText, lines),
            vin: this.extractVin(normalizedText, lines),
            engineType: this.extractEngineType(normalizedText, lines),
            displacement: this.extractDisplacement(normalizedText, lines),
            passengerCapacity: this.extractPassengerCapacity(normalizedText, lines),
            maxLoadCapacity: this.extractMaxLoad(normalizedText, lines),
            fuelType: this.extractFuelType(normalizedText),
            location: this.extractLocation(normalizedText, lines),
            ownerName: this.extractOwnerName(normalizedText, lines),
            firstRegistrationDate: this.extractFirstDate(normalizedText),
            inspectionValidity: this.extractInspectionValidity(normalizedText),
        };
    }
    static empty() {
        return {
            carNumber: '',
            carType: '',
            purpose: '',
            carName: '',
            modelInfo: '',
            vin: '',
            engineType: '',
            displacement: '',
            passengerCapacity: '',
            maxLoadCapacity: '',
            fuelType: '',
            location: '',
            ownerName: '',
            firstRegistrationDate: '',
            inspectionValidity: '',
        };
    }
    static normalizeOcrText(text) {
        return text
            .replace(/\r/g, '')
            .replace(/\u0000/g, '')
            .replace(/[¦]/g, '|')
            .replace(/ㅣ/g, '|')
            .replace(/[“”]/g, '"')
            .replace(/[‘’`]/g, "'")
            .replace(/[·•]/g, ' ')
            .replace(/[①-⑳]/g, ' ')
            .replace(/[ \t]+/g, ' ');
    }
    static extractCarNumber(text, lines) {
        const fixed = text.replace(/\?(\d)/g, '7$1');
        for (const pattern of [
            /자동차\s*등록\s*[번빈]\s*호[^|｜:：\n]*[|｜:：][^\d가-힣\n]*(\d{1,3})\s*([가-힣])\s*(\d{4})/,
            /등록\s*[번빈]\s*호[^|｜:：\n]*[|｜:：][^\d가-힣\n]*(\d{1,3})\s*([가-힣])\s*(\d{4})/,
            /자동차등록번호\s*(\d{1,3})\s*([가-힣])\s*(\d{4})/,
        ]) {
            const match = fixed.match(pattern);
            if (match)
                return `${match[1]}${match[2]}${match[3]}`;
        }
        for (let i = 0; i < lines.length; i++) {
            if (!/등록|번호|차량|자동차/.test(lines[i]))
                continue;
            const joined = [lines[i], lines[i + 1] ?? '', lines[i + 2] ?? ''].join(' ');
            const match = joined.match(/(\d{2,3})\s*([가-힣])\s*(\d{4})/);
            if (match)
                return `${match[1]}${match[2]}${match[3]}`;
        }
        const fallback = fixed.match(/(?:^|[^\d])(\d{2,3})\s*([가-힣])\s*(\d{4})(?:[^\d]|$)/);
        return fallback ? `${fallback[1]}${fallback[2]}${fallback[3]}` : '';
    }
    static extractCarType(text) {
        const spaced = text.match(/([경소중대]형)\s*(승용|승합)/);
        if (spaced)
            return `${spaced[1]}${spaced[2]}`;
        const labeled = text.match(/차\s*[종중7][^\n]{0,20}([가-힣]{1,8}\s*(?:승용|승합|화물|특수))/);
        if (labeled)
            return this.normalizeCarTypeValue(labeled[1]);
        for (const type of [
            '중형승합',
            '소형승합',
            '대형승합',
            '경형승합',
            '중형승용',
            '소형승용',
            '대형승용',
            '경형승용',
            '승합',
            '승용',
            '화물',
            '특수',
        ]) {
            if (text.replace(/\s+/g, '').includes(type))
                return type;
        }
        return '';
    }
    static normalizeCarTypeValue(value) {
        const cleaned = value.replace(/\s+/g, '').replace(/[^가-힣]/g, '');
        if (!cleaned)
            return '';
        for (const type of [
            '중형승합',
            '소형승합',
            '대형승합',
            '경형승합',
            '중형승용',
            '소형승용',
            '대형승용',
            '경형승용',
            '승합',
            '승용',
            '화물',
            '특수',
        ]) {
            if (cleaned.includes(type))
                return type;
        }
        return cleaned;
    }
    static extractPurpose(text) {
        const match = text.match(/용\s*도(?:\s*[|｜:：]|\s+)?\s*(자가용|사가용|영업용|관용)/);
        if (!match)
            return '';
        return match[1] === '사가용' ? '자가용' : match[1];
    }
    static extractCarName(text, lines) {
        for (let i = 0; i < lines.length; i++) {
            if (!/차\s*명/.test(lines[i]))
                continue;
            const sameLine = this.extractInlineValue(lines[i], /차\s*명/);
            if (this.isLikelyCarName(sameLine))
                return this.cleanCarName(sameLine);
            for (const candidate of [lines[i + 1] ?? '', lines[i + 2] ?? '']) {
                if (this.isLikelyCarName(candidate))
                    return this.cleanCarName(candidate);
            }
        }
        const block = this.getLabelWindow(text, /차\s*명/, 0, 80);
        if (block) {
            for (const candidate of block.split('\n').map((line) => line.trim())) {
                if (this.isLikelyCarName(candidate))
                    return this.cleanCarName(candidate);
            }
        }
        return '';
    }
    static isLikelyCarName(value) {
        const cleaned = value.trim();
        if (!cleaned || cleaned.length < 2 || cleaned.length > 30)
            return false;
        if (this.isLikelyLabel(cleaned))
            return false;
        if (/^[A-Z0-9-]{8,}$/.test(cleaned))
            return false;
        if (/^\d{4}[-./]\d{1,2}(?:[-./]\d{1,2})?$/.test(cleaned))
            return false;
        return /[가-힣A-Za-z]/.test(cleaned);
    }
    static cleanCarName(value) {
        return value
            .replace(/^.*차\s*명\s*[|｜:：]?\s*/u, '')
            .replace(/\*.*$/, '')
            .replace(/\s+(?:형\s*식|차\s*대\s*번\s*호|원\s*동\s*기\s*형\s*식).*$/u, '')
            .trim();
    }
    static extractModelInfo(text, lines) {
        for (let i = 0; i < lines.length; i++) {
            if (!/형\s*식/.test(lines[i]))
                continue;
            const sameLine = this.extractInlineValue(lines[i], /형\s*식(?:\s*및\s*(?:모델\s*연\s*도|제작연월))?/);
            const nearby = [sameLine, lines[i + 1] ?? '', lines[i + 2] ?? '', lines[i + 3] ?? '', lines[i + 4] ?? ''];
            const code = nearby.map((value) => this.extractModelCode(value)).find(Boolean) ?? '';
            const year = nearby.map((value) => this.extractYearMonth(value)).find(Boolean) ?? '';
            if (code && year)
                return `${code} / ${year}`;
            if (code)
                return code;
            if (year)
                return year;
        }
        const block = this.getLabelWindow(text, /형\s*식(?:\s*및\s*(?:모델\s*연\s*도|제작연월))?/, 0, 120);
        if (block) {
            const code = this.extractModelCode(block);
            const year = this.extractYearMonth(block);
            if (code && year)
                return `${code} / ${year}`;
            if (code)
                return code;
        }
        return '';
    }
    static extractModelCode(value) {
        const cleaned = value.trim().replace(/^.*형\s*식(?:\s*및\s*(?:모델\s*연\s*도|제작연월))?\s*/u, '');
        if (!cleaned || this.isLikelyLabel(cleaned))
            return '';
        const candidates = cleaned.match(/[A-Z0-9]{2,}(?:-[A-Z0-9]{1,}){0,3}/gi) ?? [];
        for (const candidate of candidates) {
            const normalized = candidate.toUpperCase();
            if (/^\d{4}(?:-\d{1,2})?$/.test(normalized))
                continue;
            if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(normalized))
                continue;
            if (normalized.length <= 12)
                return normalized;
        }
        return '';
    }
    static extractYearMonth(value) {
        const match = value.match(/\b(19\d{2}|20[0-3]\d)[-./](\d{1,2})(?![-./]\d)/);
        if (match)
            return `${match[1]}-${match[2].padStart(2, '0')}`;
        const yearOnly = value.match(/\b(19\d{2}|20[0-3]\d)\b/);
        return yearOnly ? yearOnly[1] : '';
    }
    static extractEngineType(text, lines) {
        for (let i = 0; i < lines.length; i++) {
            if (!/원\s*동\s*기\s*형\s*식/.test(lines[i]))
                continue;
            for (const candidate of [
                this.extractInlineValue(lines[i], /원\s*동\s*기\s*형\s*식/),
                lines[i + 1] ?? '',
                lines[i - 1] ?? '',
            ]) {
                const cleaned = candidate.toUpperCase().replace(/[^A-Z0-9-]/g, '');
                if (/^[A-Z0-9-]{3,12}$/.test(cleaned) && /[A-Z]/.test(cleaned) && /\d/.test(cleaned)) {
                    return cleaned;
                }
            }
        }
        const block = this.getLabelWindow(text, /원\s*동\s*기\s*형\s*식/, 30, 80);
        if (block) {
            const matches = block.toUpperCase().match(/[A-Z0-9-]{3,12}/g) ?? [];
            for (const candidate of matches) {
                if (/[A-Z]/.test(candidate) && /\d/.test(candidate))
                    return candidate;
            }
        }
        return '';
    }
    static extractVin(text, lines) {
        for (const pattern of [
            /차\s*대\s*번\s*호\s*[|｜:：]?\s*([A-Z0-9]{10,17})/i,
            /대\s*번\s*호\s*[|｜:：]?\s*([A-Z0-9]{10,17})/i,
        ]) {
            const match = text.match(pattern);
            if (match)
                return match[1].toUpperCase();
        }
        for (let i = 0; i < lines.length; i++) {
            if (!/차\s*대\s*번\s*호|대\s*번\s*호/.test(lines[i]))
                continue;
            const joined = [lines[i], lines[i + 1] ?? ''].join(' ');
            const match = joined.match(/([A-HJ-NPR-Z0-9]{17})/i);
            if (match)
                return match[1].toUpperCase();
        }
        const fallback = text.match(/\b([A-HJ-NPR-Z0-9]{17})\b/i);
        return fallback ? fallback[1].toUpperCase() : '';
    }
    static extractDisplacement(text, lines) {
        for (const value of [
            text.match(/배\s*기\s*량\s*[|｜:：]?\s*(\d[\d,]+)\s*c{0,2}/i)?.[1] ?? '',
            text.match(/(\d{3,5})\s*cc/i)?.[1] ?? '',
        ]) {
            if (value)
                return value.replace(/,/g, '');
        }
        for (let i = 0; i < lines.length; i++) {
            if (!/배\s*기\s*량/.test(lines[i]))
                continue;
            const match = [lines[i], lines[i + 1] ?? ''].join(' ').match(/(\d{3,5})/);
            if (match)
                return match[1];
        }
        return '';
    }
    static extractPassengerCapacity(text, lines) {
        for (const value of [
            text.match(/[승숭]\s*차\s*정\s*원(?:\s*[|｜:：]|\s{2,})\s*(\d{1,2})(?:\s*명)?/)?.[1] ?? '',
            text.match(/[승숭]\s*차\s*정\s*원[^\n]{0,12}?(\d{1,2})\s*명/)?.[1] ?? '',
        ]) {
            if (value)
                return value;
        }
        for (let i = 0; i < lines.length; i++) {
            if (!/[승숭]\s*차\s*정\s*원/.test(lines[i]))
                continue;
            const match = [lines[i], lines[i + 1] ?? ''].join(' ').match(/(\d{1,2})\s*명?/);
            if (match)
                return match[1];
        }
        return '';
    }
    static extractMaxLoad(text, lines) {
        for (const value of [
            text.match(/최\s*대\s*적\s*재\s*량\s*[|｜:：]?\s*(\d[\d,]*)\s*k?g?/i)?.[1] ?? '',
            text.match(/최\s*대\s*적\s*재\s*량[^\n]*?(\d[\d,]+)\s*kg/i)?.[1] ?? '',
        ]) {
            if (value)
                return value.replace(/,/g, '');
        }
        if (this.extractCarType(text).includes('승용'))
            return '0';
        for (let i = 0; i < lines.length; i++) {
            if (!/최\s*대\s*적\s*재\s*량/.test(lines[i]))
                continue;
            const match = [lines[i], lines[i + 1] ?? ''].join(' ').match(/(\d[\d,]*)/);
            if (match)
                return match[1].replace(/,/g, '');
        }
        return '';
    }
    static extractFuelType(text) {
        const labeled = text.match(/(?:연\s*료\s*의?\s*종\s*류|사\s*용\s*연\s*료)\s*[|｜:：]?\s*([가-힣A-Za-z]{2,10})/);
        if (labeled)
            return labeled[1].trim();
        for (const fuel of ['가솔린', '휘발유', '디젤', '경유', 'LPG', '하이브리드', 'CNG']) {
            if (text.includes(fuel))
                return fuel;
        }
        return '';
    }
    static extractLocation(text, lines) {
        const inline = text.match(/사\s*용\s*본\s*거\s*지\s*[|｜:：]?\s*([^\n]{5,80})/);
        if (inline)
            return this.cleanLocation(inline[1]);
        for (let i = 0; i < lines.length; i++) {
            if (!/사\s*용\s*본\s*거\s*지/.test(lines[i]))
                continue;
            const sameLine = this.extractInlineValue(lines[i], /사\s*용\s*본\s*거\s*지/);
            if (this.isLikelyLocation(sameLine))
                return this.cleanLocation(sameLine);
            for (const candidate of [lines[i + 1] ?? '', lines[i + 2] ?? '']) {
                if (this.isLikelyLocation(candidate))
                    return this.cleanLocation(candidate);
            }
        }
        return '';
    }
    static isLikelyLocation(value) {
        const cleaned = value.trim();
        if (!cleaned || cleaned.length < 5)
            return false;
        if (this.isLikelyLabel(cleaned))
            return false;
        return /[가-힣]/.test(cleaned) && /\d|로|길|동|호|구/.test(cleaned);
    }
    static cleanLocation(value) {
        return value
            .replace(/['"'`]/g, '')
            .replace(/\*.*$/, '')
            .replace(/\s{3,}.*$/, '')
            .trim();
    }
    static extractOwnerName(text, lines) {
        const corporate = text.match(/\(주\)\s*[가-힣A-Za-z0-9]{2,20}/);
        if (corporate)
            return corporate[0];
        for (let i = 0; i < lines.length; i++) {
            if (!/성\s*명|소\s*유\s*자/.test(lines[i]))
                continue;
            for (const candidate of [lines[i], lines[i + 1] ?? '']) {
                const cleaned = candidate
                    .replace(/^.*성\s*명[^|｜:：]*[|｜:：]?\s*/u, '')
                    .replace(/^.*소\s*유\s*자[^|｜:：]*[|｜:：]?\s*/u, '')
                    .replace(/\*.*$/, '')
                    .replace(/\[.*?\]/g, '')
                    .replace(/[~\])>]+.*$/, '')
                    .replace(/[^()가-힣A-Za-z0-9\s]/g, ' ')
                    .replace(/\s{2,}/g, ' ')
                    .trim();
                if (cleaned.length >= 3 && cleaned !== '(주)' && !this.isLikelyLabel(cleaned))
                    return cleaned;
            }
        }
        return '';
    }
    static extractFirstDate(text) {
        const block = this.getLabelWindow(text, /최\s*초\s*등\s*록\s*일/, 0, 120);
        if (block) {
            const koreanDate = block.match(/(19\d{2}|20[0-3]\d)\s*년\D{0,10}(\d{1,2})\s*월\D{0,10}(\d{1,2})\s*일/);
            if (koreanDate) {
                return `${koreanDate[1]}-${koreanDate[2].padStart(2, '0')}-${koreanDate[3].padStart(2, '0')}`;
            }
            const dashedDate = block.match(/\b(19\d{2}|20[0-3]\d)[-./](\d{1,2})[-./](\d{1,2})\b/);
            if (dashedDate) {
                return `${dashedDate[1]}-${dashedDate[2].padStart(2, '0')}-${dashedDate[3].padStart(2, '0')}`;
            }
        }
        return '';
    }
    static extractInspectionValidity(text) {
        const dateRe = /(\d{4}[-./=]\d{1,2}[-./=]\d{1,2})\s*(\d{4}[-./=]\d{1,2}[-./=]\d{1,2})/g;
        const all = [...text.matchAll(dateRe)];
        if (all.length === 0)
            return '';
        const last = all[all.length - 1];
        const from = this.normalizeDateString(last[1]);
        const to = this.normalizeDateString(last[2]);
        const afterDate = text.slice(last.index + last[0].length, last.index + last[0].length + 40);
        const typeMatch = afterDate.match(/[종정][합기]\s*검사/);
        const inspectionType = typeMatch ? typeMatch[0].replace(/\s/g, '') : '';
        return inspectionType ? `${from} ~ ${to} (${inspectionType})` : `${from} ~ ${to}`;
    }
    static normalizeDateString(value) {
        const match = value.match(/(\d{4})[-./=](\d{1,2})[-./=](\d{1,2})/);
        if (!match)
            return value.replace(/[.=]/g, '-');
        return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
    }
    static getLabelWindow(text, labelRegex, before, after) {
        const match = text.match(labelRegex);
        if (!match || match.index == null)
            return '';
        const start = Math.max(0, match.index - before);
        return text.slice(start, match.index + match[0].length + after);
    }
    static extractInlineValue(line, labelRegex) {
        return line.replace(new RegExp(`^.*${labelRegex.source}\\s*[|｜:：]?\\s*`, 'u'), '').trim();
    }
    static isLikelyLabel(value) {
        return /(자동차등록번호|차종|용도|차명|형식|모델연도|제작연월|차대번호|원동기형식|사용본거지|성명|소유자|최초등록일|검사\s*유효기간|배기량|승차정원|최대적재량|연료)/.test(value);
    }
}
exports.VehicleRegistrationTextParser = VehicleRegistrationTextParser;
//# sourceMappingURL=vehicle-registration-text.parser.js.map