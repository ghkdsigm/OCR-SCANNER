import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { createWorker, OEM, PSM } from 'tesseract.js'
import type { Worker } from 'tesseract.js'
import * as sharp from 'sharp'
import type { OcrProvider, VehicleRegistrationOcrResult } from './ocr-provider.interface'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse')

/** | (U+007C) 와 ｜ (U+FF5C 전각 파이프) 양쪽 모두 구분자로 허용 */
const SEP = '[|｜:：]'

@Injectable()
export class TesseractOcrProvider implements OcrProvider, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TesseractOcrProvider.name)
  private worker: Worker | null = null

  async onModuleInit() {
    this.logger.log('Tesseract worker 초기화 중 (kor+eng)…')
    this.worker = await createWorker(['kor', 'eng'], OEM.LSTM_ONLY, {
      logger: (m) => {
        if (m.status === 'loading tesseract core') this.logger.log('Tesseract core 로딩 중…')
        if (m.status === 'initialized tesseract') this.logger.log('Tesseract 초기화 완료')
        if (m.status === 'loading language traineddata') this.logger.log('한국어 언어 데이터 로딩 중…')
      },
    })
    await this.worker.setParameters({ tessedit_pageseg_mode: PSM.AUTO })
    this.logger.log('Tesseract worker 준비 완료')
  }

  async onModuleDestroy() {
    await this.worker?.terminate()
  }

  async analyzeVehicleRegistration(file: Express.Multer.File): Promise<VehicleRegistrationOcrResult> {
    if (file.mimetype === 'application/pdf') return this.analyzeFromPdf(file)
    return this.analyzeFromImage(file)
  }

  // ── 이미지 처리 ──────────────────────────────────────────────────
  /**
   * 자동차등록증은 두 영역으로 구성된다.
   *   - 상단 (~65%): 등록 정보 (차량번호, 차명, 차대번호 등)  → PSM.AUTO
   *   - 하단 (~40%): 제원 테이블 + 검사유효기간 테이블        → PSM.SPARSE_TEXT + 2x 업스케일
   *
   * 두 영역을 각각 OCR한 뒤 합산하여 파싱한다.
   */
  private async analyzeFromImage(file: Express.Multer.File): Promise<VehicleRegistrationOcrResult> {
    const meta = await sharp(file.buffer).metadata()
    const h = meta.height ?? 1000
    const w = meta.width ?? 800

    // ── Pass 1: 전체 이미지 AUTO ────────────────────────────────
    const fullBuf = await this.preprocess(file.buffer)
    await this.setPsm(PSM.AUTO)
    const fullText = await this.runOcr(fullBuf)

    // ── Pass 2~4: 영역별 보강 OCR ──────────────────────────────
    const firstRegistrationText = await this.ocrFirstRegistrationRegion(file.buffer, w, h)
    const purposeText = await this.ocrPurposeRegion(file.buffer, w, h)
    const vinText = await this.ocrVinRegion(file.buffer, w, h)
    const upperSummaryText = await this.ocrUpperSummaryRegion(file.buffer, w, h)
    const specsText = await this.ocrSpecsRegion(file.buffer, w, h)
    const inspectionText = await this.ocrInspectionRegion(file.buffer, w, h)

    // ── Pass 5: 하단 전체 영역(60%~) 2x 업스케일 + SPARSE_TEXT ─
    const lowerText = await this.ocrLowerRegion(file.buffer, w, h)

    const combined = [firstRegistrationText, purposeText, vinText, upperSummaryText, specsText, inspectionText, fullText, lowerText]
      .filter(Boolean)
      .join('\n\n')
    this.logger.debug(`[Pass2 최초등록일]\n${firstRegistrationText}`)
    this.logger.debug(`[Pass3 용도]\n${purposeText}`)
    this.logger.debug(`[Pass4 차대번호]\n${vinText}`)
    this.logger.debug(`[Pass5 상단 우측]\n${upperSummaryText}`)
    this.logger.debug(`[Pass6 제원표]\n${specsText}`)
    this.logger.debug(`[Pass7 검사표]\n${inspectionText}`)
    this.logger.debug(`[Pass1 전체]\n${fullText}`)
    this.logger.debug(`[Pass8 하단]\n${lowerText}`)

    return this.parse(combined)
  }

  private async ocrFirstRegistrationRegion(buffer: Buffer, w: number, h: number): Promise<string> {
    return this.ocrRegion(
      '최초등록일',
      buffer,
      {
        left: Math.floor(w * 0.62),
        top: Math.floor(h * 0.06),
        width: Math.floor(w * 0.32),
        height: Math.floor(h * 0.09),
      },
      PSM.SINGLE_BLOCK,
      6.0,
    )
  }

  private async ocrPurposeRegion(buffer: Buffer, w: number, h: number): Promise<string> {
    return this.ocrRegion(
      '용도',
      buffer,
      {
        left: Math.floor(w * 0.84),
        top: Math.floor(h * 0.12),
        width: Math.floor(w * 0.12),
        height: Math.floor(h * 0.09),
      },
      PSM.SINGLE_BLOCK,
      5.0,
    )
  }

  private async ocrVinRegion(buffer: Buffer, w: number, h: number): Promise<string> {
    await this.worker?.setParameters({
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
    })
  
    try {
      return await this.ocrRegion(
        '차대번호',
        buffer,
        {
          left: Math.floor(w * 0.03),
          top: Math.floor(h * 0.14),
          width: Math.floor(w * 0.56),
          height: Math.floor(h * 0.07),
        },
        PSM.SINGLE_LINE,
        4.0,
      )
    } finally {
      await this.worker?.setParameters({
        tessedit_char_whitelist: '',
      })
    }
  }

  private async ocrUpperSummaryRegion(buffer: Buffer, w: number, h: number): Promise<string> {
    return this.ocrRegion(
      '상단 우측',
      buffer,
      {
        left: Math.floor(w * 0.46),
        top: Math.floor(h * 0.08),
        width: Math.floor(w * 0.50),
        height: Math.floor(h * 0.20),
      },
      PSM.SPARSE_TEXT,
      2.8,
    )
  }

  private async ocrSpecsRegion(buffer: Buffer, w: number, h: number): Promise<string> {
    return this.ocrRegion(
      '제원표',
      buffer,
      {
        left: Math.floor(w * 0.01),
        top: Math.floor(h * 0.58),
        width: Math.floor(w * 0.54),
        height: Math.floor(h * 0.13),
      },
      PSM.SINGLE_BLOCK,
      4.0,
    )
  }

  private async ocrInspectionRegion(buffer: Buffer, w: number, h: number): Promise<string> {
    return this.ocrRegion(
      '검사표',
      buffer,
      {
        left: Math.floor(w * 0.53),
        top: Math.floor(h * 0.58),
        width: Math.floor(w * 0.45),
        height: Math.floor(h * 0.13),
      },
      PSM.SINGLE_BLOCK,
      4.0,
    )
  }

  private async ocrLowerRegion(buffer: Buffer, w: number, h: number): Promise<string> {
    try {
      const cropTop = Math.floor(h * 0.60)
      const cropH = h - cropTop

      // 2배 업스케일: 소형 텍스트 인식률 향상
      const lowerBuf = await sharp(buffer)
        .extract({ left: 0, top: cropTop, width: w, height: cropH })
        .resize({ width: Math.min(w * 2, 3200) })
        .grayscale()
        .normalize()
        .sharpen({ sigma: 2.0 })
        .toBuffer()

      await this.setPsm(PSM.SPARSE_TEXT)
      const text = await this.runOcr(lowerBuf)
      await this.setPsm(PSM.AUTO)   // 원상복구
      return text
    } catch (err) {
      this.logger.warn(`하단 영역 OCR 실패: ${(err as Error).message}`)
      return ''
    }
  }

  private async ocrRegion(
    label: string,
    buffer: Buffer,
    rect: { left: number; top: number; width: number; height: number },
    psm: PSM,
    scale = 2.0,
  ): Promise<string> {
    try {
      const regionBuf = await sharp(buffer)
        .extract(rect)
        .resize({ width: Math.min(Math.round(rect.width * scale), 3200) })
        .grayscale()
        .normalize()
        .threshold(160)
        .sharpen({ sigma: 2.2 })
        .toBuffer()

      await this.setPsm(psm)
      const text = await this.runOcr(regionBuf)
      await this.setPsm(PSM.AUTO)
      return text
    } catch (err) {
      this.logger.warn(`${label} OCR 실패: ${(err as Error).message}`)
      await this.setPsm(PSM.AUTO)
      return ''
    }
  }

  private async preprocess(buffer: Buffer): Promise<Buffer> {
    try {
      return await sharp(buffer)
        .grayscale()
        .normalize()
        .sharpen({ sigma: 1.5 })
        .toBuffer()
    } catch {
      return buffer
    }
  }

  private async setPsm(psm: PSM) {
    await this.worker?.setParameters({ tessedit_pageseg_mode: psm })
  }

  private async runOcr(buffer: Buffer): Promise<string> {
    if (!this.worker) throw new Error('Tesseract worker 미초기화')
    const { data: { text, confidence } } = await this.worker.recognize(buffer)
    this.logger.debug(`OCR 신뢰도: ${confidence?.toFixed(1)}%`)
    return text
  }

  // ── PDF ─────────────────────────────────────────────────────────
  private async analyzeFromPdf(file: Express.Multer.File): Promise<VehicleRegistrationOcrResult> {
    try {
      const data = await pdfParse(file.buffer)
      if ((data?.text ?? '').trim().length > 30) {
        this.logger.debug('텍스트 기반 PDF: 직접 파싱')
        return this.parse(data.text)
      }
    } catch (err) {
      this.logger.warn(`pdf-parse 실패: ${(err as Error).message}`)
    }
    this.logger.warn('이미지 전용 PDF는 처리 불가 — 이미지로 재업로드 필요')
    return this.empty()
  }

  // ── 파싱 ─────────────────────────────────────────────────────────
  private parse(text: string): VehicleRegistrationOcrResult {
    const normalizedText = this.normalizeOcrText(text)
    const lines = normalizedText.split('\n').map((l) => l.trim()).filter(Boolean)
    return {
      carNumber:             this.extractCarNumber(normalizedText),
      carType:               this.extractCarType(normalizedText),
      purpose:               this.extractPurpose(normalizedText),
      carName:               this.extractCarName(normalizedText),
      modelInfo:             this.extractModelInfo(normalizedText),
      vin:                   this.extractVin(normalizedText, lines),
      engineType:            this.extractEngineType(normalizedText),
      displacement:          this.extractDisplacement(normalizedText),
      passengerCapacity:     this.extractPassengerCapacity(normalizedText),
      maxLoadCapacity:       this.extractMaxLoad(normalizedText),
      fuelType:              this.extractFuelType(normalizedText),
      location:              this.extractLocation(normalizedText),
      ownerName:             this.extractOwnerName(normalizedText),
      firstRegistrationDate: this.extractFirstDate(normalizedText),
      inspectionValidity:    this.extractInspectionValidity(normalizedText),
    }
  }

  private normalizeOcrText(text: string): string {
    return text
      .replace(/\r/g, '')
      .replace(/\u0000/g, '')
      .replace(/[¦]/g, '|')
      .replace(/ㅣ/g, '|')
      .replace(/[“”]/g, '"')
      .replace(/[‘’`]/g, "'")
      .replace(/[·•]/g, ' ')
      .replace(/[ \t]+/g, ' ')
  }

  /**
   * 공통 helper: "라벨 [|｜:：] 값" 패턴에서 값 추출
   */
  private field(text: string, labelRe: RegExp): string {
    const pat = new RegExp(labelRe.source + `(?:\\s*${SEP}+|\\s{2,})\\s*([^|｜<\\n]{1,40})`)
    const m = text.match(pat)
    if (!m) return ''
    return m[1].trim()
      .replace(/\s{3,}.*$/, '')
      .replace(/['"'`]/g, '')
      .replace(/[.,。]$/, '')
      .trim()
  }

  // ── 개별 필드 ────────────────────────────────────────────────────

  /** 차량번호: 숫자2-3 + 한글1 + 숫자4 */
  private extractCarNumber(text: string): string {
    // Tesseract가 7을 ?로 오인식하는 패턴 보정 (?뒤에 숫자가 오면 7로 복원)
    const fixed = text.replace(/\?(\d)/g, '7$1')

    for (const p of [
      /자동차\s*등록\s*[번빈]\s*호[^|｜:：\n]*[|｜:：][^\d가-힣\n]*(\d{1,3})\s*([가-힣])\s*(\d{4})/,
      /등록\s*[번빈]\s*호[^|｜:：\n]*[|｜:：][^\d가-힣\n]*(\d{1,3})\s*([가-힣])\s*(\d{4})/,
    ]) {
      const m = fixed.match(p)
      if (m) return `${m[1]}${m[2]}${m[3]}`
    }

    for (const line of fixed.split('\n').map((value) => value.trim()).filter(Boolean)) {
      if (!/등록|번호|차량|자동차/.test(line)) continue
      const m = line.match(/(\d{2,3})\s*([가-힣])\s*(\d{4})/)
      if (m) return `${m[1]}${m[2]}${m[3]}`
    }

    // 라벨 없이 직접 탐색
    const m = fixed.match(/(?:^|[^\d])(\d{2,3})\s*([가-힣])\s*(\d{4})(?:[^\d]|$)/)
    if (m) return `${m[1]}${m[2]}${m[3]}`

    return ''
  }

  /** 차종: 라벨 기반 → 사전 기반 fallback */
  private extractCarType(text: string): string {
    for (const p of [
      /차\s*[종중7](?:\s*[|｜:：]|\s{2,})\s*([가-힣]{1,10})/,
      /차\s*량?\s*종\s*류(?:\s*[|｜:：]|\s{2,})\s*([가-힣]{1,10})/,
    ]) {
      const m = text.match(p)
      if (m) return this.normalizeCarTypeValue(m[1])
    }

    const types = [
      '중형승합', '소형승합', '대형승합', '경형승합',
      '중형승용', '소형승용', '대형승용', '경형승용',
      '승합', '승용', '화물', '특수',
    ]
    for (const t of types) {
      if (text.includes(t)) return this.normalizeCarTypeValue(t)
    }
    return ''
  }

  private normalizeCarTypeValue(value: string): string {
    const cleaned = value.replace(/[^가-힣]/g, '').trim()
    if (!cleaned) return ''

    const exactTypes = [
      '중형승합', '소형승합', '대형승합', '경형승합',
      '중형승용', '소형승용', '대형승용', '경형승용',
      '승합', '승용', '화물', '특수',
    ]
    for (const type of exactTypes) {
      if (cleaned === type) return type
    }

    if (cleaned.includes('승합')) {
      if (cleaned.includes('경형')) return '경형승합'
      if (cleaned.includes('소형')) return '소형승합'
      if (cleaned.includes('중형')) return '중형승합'
      if (cleaned.includes('대형')) return '대형승합'
      return '승합'
    }

    if (cleaned.includes('승용')) {
      if (cleaned.includes('경형')) return '경형승용'
      if (cleaned.includes('소형')) return '소형승용'
      if (cleaned.includes('중형')) return '중형승용'
      if (cleaned.includes('대형')) return '대형승용'
      return '승용'
    }

    if (cleaned.includes('화물')) return '화물'
    if (cleaned.includes('특수')) return '특수'

    return cleaned.slice(0, 10)
  }

  /** 용도: 라벨 기반 → 사전 기반 fallback */
  private extractPurpose(text: string): string {
    for (const p of [
      /용\s*도(?:\s*[|｜:：]|\s{2,})\s*([가-힣]{2,6})/,
      /용\s*[8도](?:\s*[|｜:：]|\s{2,})\s*([가-힣]{2,6})/,
    ]) {
      const m = text.match(p)
      if (m) return this.normalizePurposeValue(m[1])
    }

    const purposes = ['자가용', '사가용', '영업용', '관용']
    for (const p of purposes) if (text.includes(p)) return this.normalizePurposeValue(p)
    return ''
  }

  private normalizePurposeValue(value: string): string {
    const cleaned = value.trim()
    if (cleaned === '사가용') return '자가용'
    return cleaned
  }

  /** 차명: "@차     명| 그랜드카니발" 형태 */
  private extractCarName(text: string): string {
    for (const line of text.split('\n').map((value) => value.trim()).filter(Boolean)) {
      if (!/[©@]?\s*차(?:\s*명)?\s*[|｜:：]/.test(line)) continue

      const candidate = line
        .replace(/^.*[©@]?\s*차(?:\s*명)?\s*[|｜:：]?\s*/u, '')
        .replace(/\s+[<©@&].*$/, '')
        .replace(/\s+(?:[<©@&]\s*)?(?:형\s*식|형\s*식\s*및\s*모델\s*연\s*도|모델\s*연\s*도|차\s*대\s*번\s*호|원\s*동\s*기\s*형\s*식).*$/u, '')
        .replace(/\s*<\s*$/, '')
        .trim()

      if (candidate) return candidate
    }

    const m = text.match(/[©@]?\s*차(?:\s*명)?\s*[|｜:：]+\s*([가-힣A-Za-z0-9][^|｜<\n]{1,30})/)
    if (m) {
      return m[1]
        .trim()
        .replace(/\s+[<©@&].*$/, '')
        .replace(/\s+(?:[<©@&]\s*)?(?:형\s*식|형\s*식\s*및\s*모델\s*연\s*도|모델\s*연\s*도|차\s*대\s*번\s*호|원\s*동\s*기\s*형\s*식).*$/u, '')
        .replace(/\s*<\s*$/, '')
        .replace(/\s{3,}.*$/, '')
        .trim()
    }
    return ''
  }

  /** 형식 및 모델연도(제작연월) */
  private extractModelInfo(text: string): string {
    const lines = text.split('\n').map((line) => line.trim()).filter(Boolean)

    for (let i = 0; i < lines.length; i++) {
      const code = lines[i]
        .replace(/^[^A-Za-z0-9]+/, '')
        .replace(/[^A-Za-z0-9-]/g, '')
        .toUpperCase()

      const alphaCount = (code.match(/[A-Z]/g) ?? []).length
      if (alphaCount < 3 || /^(19|20)\d{2}-/.test(code)) continue
      if (!/^[A-Z0-9]{2,}(?:-[A-Z0-9]{1,}){1,5}$/.test(code)) continue

      const nearby = [lines[i], lines[i + 1] ?? '', lines[i + 2] ?? ''].join(' ')
      const year = nearby.match(/\b(19\d{2}|20[0-3]\d)\b/)?.[1]
      if (year) return `${code} / ${year}`
      return code
    }

    for (const p of [
      /형\s*식(?:\s*및\s*모델\s*연\s*도)?\s*[|｜:：]?\s*([^\n]{4,50})/i,
      /모델\s*연\s*도\s*[|｜:：]?\s*([^\n]{4,50})/i,
    ]) {
      const m = text.match(p)
      if (!m) continue

      const cleaned = m[1]
        .replace(/^[^A-Za-z0-9]+/, '')
        .replace(/[^A-Za-z0-9/ -]+/g, '')
        .replace(/\s{2,}/g, ' ')
        .trim()

      const code = cleaned.match(/[A-Z0-9]{2,}(?:-[A-Z0-9]{1,}){1,5}/i)?.[0]?.toUpperCase()
      const year = cleaned.match(/\b(19\d{2}|20[0-3]\d)\b/)?.[1]

      if (code && year) return `${code} / ${year}`
      if (cleaned.length >= 4) return cleaned
    }
    return ''
  }

  private extractEngineType(text: string): string {
    for (const candidate of [
      this.field(text, /원\s*동\s*기\s*형\s*식/),
      text.match(/원\s*동\s*기\s*형\s*식[^\n]{0,20}([A-Z0-9-]{3,12})/i)?.[1] ?? '',
    ]) {
      const cleaned = candidate.toUpperCase().replace(/[^A-Z0-9-]/g, '')
      if (/^[A-Z0-9-]{3,12}$/.test(cleaned) && /[A-Z]/.test(cleaned) && /\d/.test(cleaned)) {
        return cleaned
      }
    }

    for (const line of text.split('\n').map((value) => value.trim()).filter(Boolean)) {
      const cleaned = line.toUpperCase().replace(/[^A-Z0-9-]/g, '')
      if (/^[A-Z]\d[A-Z0-9]{2,5}$/.test(cleaned)) return cleaned
    }

    return ''
  }

  /** 차대번호(VIN) */
  private extractVin(text: string, lines: string[]): string {
    for (const p of [
      /차\s*대\s*번\s*호\s*[|｜:：]\s*([A-Z0-9]{10,17})/i,
      /대\s*번\s*호\s*[|｜:：]\s*([A-Z0-9]{10,17})/i,
    ]) {
      const m = text.match(p); if (m) return m[1].toUpperCase()
    }
    for (let i = 0; i < lines.length; i++) {
      if (/대\s*번\s*호/.test(lines[i])) {
        const after = lines[i].split(/[|｜:：]/).slice(1).join('').trim()
        const vm = after.match(/([A-Z0-9]{10,17})/i)
        if (vm) return vm[1].toUpperCase()
        const next = lines[i + 1]
        if (next) { const vm2 = next.match(/([A-Z0-9]{10,17})/i); if (vm2) return vm2[1].toUpperCase() }
      }
    }
    const m = text.match(/\b([A-HJ-NPR-Z0-9]{17})\b/i)
    return m ? m[1].toUpperCase() : ''
  }

  /**
   * 배기량 (cc)
   * 제원 테이블: "배기량| 2199cc" 또는 "배 기 량  2199"
   */
  private extractDisplacement(text: string): string {
    // 라벨 기반
    const m = text.match(/배\s*기\s*량\s*[|｜:：]?\s*(\d[\d,]+)\s*c{0,2}/i)
    if (m) return m[1].replace(/,/g, '')

    // "숫자cc" 직접 탐색 (3-5자리 + cc)
    const m2 = text.match(/(\d{3,5})\s*cc/i)
    return m2 ? m2[1] : ''
  }

  /**
   * 승차정원 (명)
   * 제원 테이블: "승차정원  11명" 또는 "승차정원| 11"
   * 숭차정원 오인식도 허용
   */
  private extractPassengerCapacity(text: string): string {
    const m = text.match(/[승숭]\s*차\s*정\s*원(?:\s*[|｜:：]|\s{2,})\s*(\d{1,2})(?:\s*명)?/)
    if (m) return m[1]
    const m2 = text.match(/[승숭]\s*차\s*정\s*원[^\n]{0,12}?(\d{1,2})\s*명/)
    return m2 ? m2[1] : ''
  }

  /**
   * 최대적재량 (kg)
   * 승용차는 0 또는 빈 값
   */
  private extractMaxLoad(text: string): string {
    const m = text.match(/최\s*대\s*적\s*재\s*량\s*[|｜:：]?\s*(\d[\d,]*)\s*k?g?/i)
    if (m) return m[1].replace(/,/g, '')
    const m2 = text.match(/최\s*대\s*적\s*재\s*량[^\n]*?(\d[\d,]+)\s*kg/i)
    return m2 ? m2[1].replace(/,/g, '') : ''
  }

  /**
   * 연료 종류
   * 제원 테이블: "연료의 종류  경유" 또는 "사용연료| 가솔린"
   */
  private extractFuelType(text: string): string {
    // 라벨 기반
    const labeled = text.match(/(?:연\s*료\s*의?\s*종\s*류|사\s*용\s*연\s*료)\s*[|｜:：]?\s*([가-힣A-Za-z]{2,10})/)
    if (labeled) return labeled[1].trim()

    // 연료명 직접 탐색
    // 전기/수소는 하단 유의사항 본문에 자주 등장하므로 fallback에서는 제외한다.
    const fuels = ['가솔린', '휘발유', '디젤', '경유', 'LPG', '하이브리드', 'CNG']
    for (const f of fuels) {
      if (text.includes(f)) return f
    }
    return ''
  }

  /** 사용본거지 */
  private extractLocation(text: string): string {
    const m = text.match(/사\s*용\s*본\s*거\s*지\s*[|｜:：]\s*([^\n]{5,60})/)
    if (m) return m[1].trim().replace(/['"'`]/g, '').replace(/\s{3,}.*$/, '').trim()
    return ''
  }

  /** 소유자 성명(명칭) */
  private extractOwnerName(text: string): string {
    const corporate = text.match(/\(주\)\s*[가-힣A-Za-z0-9]{2,20}/)
    if (corporate) return corporate[0]

    for (const line of text.split('\n').map((value) => value.trim()).filter(Boolean)) {
      if (!/성\s*명|소\s*유\s*자/.test(line)) continue

      const candidate = line
        .replace(/^.*성\s*명[^|｜:：]*[|｜:：]?\s*/u, '')
        .replace(/^.*소\s*유\s*자[^|｜:：]*[|｜:：]?\s*/u, '')
        .replace(/\*.*$/, '')
        .replace(/\[.*?\]/g, '')
        .replace(/[~\])>]+.*$/, '')
        .replace(/[^()가-힣A-Za-z0-9\s]/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim()

      if (candidate.length >= 3 && candidate !== '(주)') return candidate
    }

    const m = text.match(/성\s*명[^|｜:：\n]*[|｜:：]+\s*([^\n|｜]{2,40})/)
    if (m) {
      const v = m[1].trim()
        .replace(/\*.*$/, '')
        .replace(/\*[^*]*\*?/g, '')
        .replace(/\[.*?\]/g, '')
        .replace(/[~\])>]+.*$/, '')
        .replace(/\s{3,}.*$/, '')
        .trim()
      if (v.length >= 3 && v !== '(주)') return v
    }
    const m2 = text.match(/소\s*유\s*자[^|｜:：\n]*[|｜:：]\s*([^\n|｜]{2,30})/)
    if (m2) return m2[1].trim().replace(/\s{3,}.*$/, '').trim()
    return ''
  }

  /** 최초등록일: YYYY-MM-DD */
  private extractFirstDate(text: string): string {
    // 최초등록일 라벨 근처에서 날짜 탐색
    const labeled = text.match(/최\s*초\s*등\s*록\s*일[^\d]{0,20}(19\d{2}|20[0-3]\d)\D{0,4}(\d{1,2})\D{0,4}(\d{1,2})/)
    if (labeled) return `${labeled[1]}-${labeled[2].padStart(2, '0')}-${labeled[3].padStart(2, '0')}`

    // 최초등록일은 문서 상단에만 있으므로 상단 일부에서만 fallback 시도
    const head = text.split('\n').slice(0, 20).join(' ')
    const m = head.match(/\b(19\d{2}|20[0-3]\d)\D{0,4}(\d{1,2})\D{0,4}(\d{1,2})\s*일?/)
    if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`

    return ''
  }

  /**
   * 검사유효기간: 가장 최근 기간 반환
   * 제원 하단 테이블: "2017-11-10 2018-11-09 90876 종합검사"
   */
  private extractInspectionValidity(text: string): string {
    // "YYYY-MM-DD YYYY-MM-DD" 또는 "YYYY.MM.DD YYYY.MM.DD" 패턴
    const dateRe = /(\d{4}[-./=]\d{1,2}[-./=]\d{1,2})\s*(\d{4}[-./=]\d{1,2}[-./=]\d{1,2})/g
    const all = [...text.matchAll(dateRe)]

    if (all.length === 0) return ''

    // 가장 마지막(최근) 기간 사용
    const last = all[all.length - 1]
    const from = this.normalizeDateString(last[1])
    const to   = this.normalizeDateString(last[2])

    // 검사구분 추출 시도 (종합검사 / 정기검사)
    const afterDate = text.slice(last.index! + last[0].length, last.index! + last[0].length + 40)
    const typeMatch = afterDate.match(/[종정][합기]\s*검사/)
    const inspType = typeMatch ? typeMatch[0].replace(/\s/g, '') : ''

    return inspType ? `${from} ~ ${to} (${inspType})` : `${from} ~ ${to}`
  }

  private normalizeDateString(value: string): string {
    const m = value.match(/(\d{4})[-./=](\d{1,2})[-./=](\d{1,2})/)
    if (!m) return value.replace(/[.=]/g, '-')
    return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
  }

  private empty(): VehicleRegistrationOcrResult {
    return {
      carNumber: '', carType: '', purpose: '', carName: '', modelInfo: '',
      vin: '', engineType: '', displacement: '', passengerCapacity: '',
      maxLoadCapacity: '', fuelType: '', location: '', ownerName: '',
      firstRegistrationDate: '', inspectionValidity: '',
    }
  }
}
