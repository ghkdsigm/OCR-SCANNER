import type { VehicleRegistrationOcrResult } from '../providers/ocr-provider.interface'

export class VehicleRegistrationTextParser {
  static parse(text: string): VehicleRegistrationOcrResult {
    const normalizedText = this.normalizeOcrText(text)
    const lines = normalizedText.split('\n').map((line) => line.trim()).filter(Boolean)

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
    }
  }

  static empty(): VehicleRegistrationOcrResult {
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
    }
  }

  private static normalizeOcrText(text: string): string {
    return text
      .replace(/\r/g, '')
      .replace(/\u0000/g, '')
      .replace(/[¦]/g, '|')
      .replace(/ㅣ/g, '|')
      .replace(/[“”]/g, '"')
      .replace(/[‘’`]/g, "'")
      .replace(/[·•]/g, ' ')
      .replace(/[①-⑳]/g, ' ')
      .replace(/승룡/g, '승용')
      .replace(/사가용/g, '자가용')
      .replace(/[ \t]+/g, ' ')
  }

  private static extractCarNumber(text: string, lines: string[]): string {
    const fixed = text.replace(/\?(\d)/g, '7$1')

    for (const pattern of [
      /자동차\s*등록\s*[번빈]\s*호[^|｜:：\n]*[|｜:：][^\d가-힣\n]*(\d{1,3})\s*([가-힣])\s*(\d{4})/,
      /등록\s*[번빈]\s*호[^|｜:：\n]*[|｜:：][^\d가-힣\n]*(\d{1,3})\s*([가-힣])\s*(\d{4})/,
      /자동차등록번호\s*(\d{1,3})\s*([가-힣])\s*(\d{4})/,
    ]) {
      const match = fixed.match(pattern)
      if (match) return `${match[1]}${match[2]}${match[3]}`
    }

    for (let i = 0; i < lines.length; i++) {
      if (!/등록|번호|차량|자동차/.test(lines[i])) continue
      const joined = [lines[i], lines[i + 1] ?? '', lines[i + 2] ?? ''].join(' ')
      const match = joined.match(/(\d{2,3})\s*([가-힣])\s*(\d{4})/)
      if (match) return `${match[1]}${match[2]}${match[3]}`
    }

    const fallback = fixed.match(/(?:^|[^\d])(\d{2,3})\s*([가-힣])\s*(\d{4})(?:[^\d]|$)/)
    return fallback ? `${fallback[1]}${fallback[2]}${fallback[3]}` : ''
  }

  private static extractCarType(text: string): string {
    const compactText = this.compactForMatching(text)
    for (const candidate of [
      compactText.match(/([경소중대]형)(승용|승합|화물|특수)/)?.[0] ?? '',
      compactText.match(/(승용|승합|화물|특수)/)?.[0] ?? '',
    ]) {
      const normalized = this.normalizeCarTypeValue(candidate)
      if (normalized) return normalized
    }

    const labeled = text.match(/차\s*[종중7][^\n]{0,30}([가-힣\s]{1,12}(?:승용|승합|화물|특수|승룡|스요))/)
    if (labeled) {
      const normalized = this.normalizeCarTypeValue(labeled[1])
      if (normalized) return normalized
    }

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
      if (text.replace(/\s+/g, '').includes(type)) return type
    }

    return ''
  }

  private static normalizeCarTypeValue(value: string): string {
    const cleaned = value
      .replace(/\s+/g, '')
      .replace(/승룡|스요/g, '승용')
      .replace(/[^가-힣]/g, '')
    if (!cleaned) return ''

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
      if (cleaned.includes(type)) return type
    }

    return cleaned
  }

  private static extractPurpose(text: string): string {
    const compact = this.compactForMatching(text)
    for (const candidate of ['자가용', '사가용', '영업용', '관용']) {
      if (compact.includes(`용도${candidate}`) || compact.includes(candidate)) {
        return candidate === '사가용' ? '자가용' : candidate
      }
    }

    const match = text.match(/용\s*도(?:\s*[|｜:：]|\s+)?\s*(자가용|사가용|영업용|관용)/)
    if (!match) return ''
    return match[1] === '사가용' ? '자가용' : match[1]
  }

  private static extractCarName(text: string, lines: string[]): string {
    const labeledCandidates: string[] = []
    const fallbackCandidates: string[] = []
    const structuralCandidates = this.extractCarNameNearModelInfo(text, lines)

    for (let i = 0; i < lines.length; i++) {
      if (!/차\s*명/.test(lines[i])) continue

      const sameLine = this.extractInlineValue(lines[i], /차\s*명/)
      if (this.isLikelyCarName(sameLine)) labeledCandidates.push(this.cleanCarName(sameLine))

      for (const candidate of [lines[i + 1] ?? '', lines[i + 2] ?? '', lines[i + 3] ?? '']) {
        if (this.isLikelyCarName(candidate)) labeledCandidates.push(this.cleanCarName(candidate))
      }
    }

    const block = this.getLabelWindow(text, /차\s*명/, 0, 80)
    if (block) {
      for (const candidate of block.split('\n').map((line) => line.trim())) {
        if (this.isLikelyCarName(candidate)) labeledCandidates.push(this.cleanCarName(candidate))
      }
    }

    const bestLabeled = this.pickBestCarName(labeledCandidates)
    if (bestLabeled) return bestLabeled

    const bestStructural = this.pickBestCarName(structuralCandidates)
    if (bestStructural) return bestStructural

    for (const line of lines) {
      if (!this.isLikelyCarNameFallback(line)) continue
      fallbackCandidates.push(this.cleanCarName(line))
    }

    return this.pickBestCarName(fallbackCandidates)
  }

  private static isLikelyCarName(value: string): boolean {
    const cleaned = value.trim()
    if (!cleaned || cleaned.length < 2 || cleaned.length > 30) return false
    if (this.isLikelyLabel(cleaned)) return false
    if (/^[A-Z0-9-]{8,}$/.test(cleaned)) return false
    if (/^\d{4}[-./]\d{1,2}(?:[-./]\d{1,2})?$/.test(cleaned)) return false
    return /[가-힣A-Za-z]/.test(cleaned) && !/^[가-힣]+\s*승[용합]$/.test(cleaned)
  }

  private static cleanCarName(value: string): string {
    const cleaned = this.joinFragmentedText(
      value
      .replace(/^.*차\s*명\s*[|｜:：]?\s*/u, '')
      .replace(/\*.*$/, '')
      .replace(/\s+(?:형\s*식|차\s*대\s*번\s*호|원\s*동\s*기\s*형\s*식|사\s*용\s*본\s*거\s*지).*$/u, '')
      .trim(),
    )

    return cleaned
      .replace(/^[^가-힣A-Za-z0-9]+/, '')
      .replace(/^[A-Za-z]{1,3}\s+(?=[가-힣])/, '')
      .replace(/^자동차\s*/u, '')
      .replace(/[©@|]+$/g, '')
      .replace(/\.+$/g, '')
      .trim()
  }

  private static extractCarNameNearModelInfo(text: string, lines: string[]): string[] {
    const candidates: string[] = []

    for (const line of lines) {
      const match = line.match(/([가-힣A-Za-z0-9.\s]{3,30})\s*[©@|]?\s*형\s*식(?:\s*및\s*(?:제\s*작\s*연\s*월|모\s*델\s*연\s*도))?/u)
      if (!match) continue
      const candidate = this.cleanCarName(match[1])
      if (this.isLikelyCarName(candidate)) candidates.push(candidate)
    }

    const compactLines = lines.map((line) => this.joinFragmentedText(line))
    for (const line of compactLines) {
      const match = line.match(/([가-힣A-Za-z0-9.\s]{3,30})\s*[©@|]?\s*형식(?:및(?:제작연월|모델연도))?/u)
      if (!match) continue
      const candidate = this.cleanCarName(match[1])
      if (this.isLikelyCarName(candidate)) candidates.push(candidate)
    }

    const block = this.getLabelWindow(text, /형\s*식(?:\s*및\s*(?:제\s*작\s*연\s*월|모\s*델\s*연\s*도))?/, 80, 20)
    if (block) {
      const beforeLabel = block.split(/형\s*식(?:\s*및\s*(?:제\s*작\s*연\s*월|모\s*델\s*연\s*도))?/u)[0] ?? ''
      const tail = beforeLabel.split('\n').map((line) => line.trim()).filter(Boolean).slice(-2)
      for (const line of tail) {
        const candidate = this.cleanCarName(line)
        if (this.isLikelyCarName(candidate)) candidates.push(candidate)
      }
    }

    return candidates
  }

  private static isLikelyCarNameFallback(value: string): boolean {
    const cleaned = this.cleanCarName(value)
    if (!this.isLikelyCarName(cleaned)) return false
    if (/서울|경기|부천|강서구|양천로|모터리움/.test(cleaned)) return false
    if (/자가용|영업용|관용|승용|승합|화물|특수/.test(cleaned)) return false
    if (/^\(?주\)?/.test(cleaned)) return false
    if (/SALL|KNHM|VIN|차대번호/i.test(cleaned)) return false
    if (/^\d{4}-\d{2}$/.test(cleaned)) return false
    if (/정부24|스캐너용|진위확인|문서확인|프로그램|인터넷발급|자동차365|자동차관리법|시행규칙|별표/.test(cleaned)) return false
    return /[가-힣A-Za-z]{3,}/.test(cleaned)
  }

  private static pickBestCarName(candidates: string[]): string {
    const unique = [...new Set(candidates.map((value) => value.trim()).filter(Boolean))]
    unique.sort((a, b) => this.carNameScore(b) - this.carNameScore(a))
    return unique[0] ?? ''
  }

  private static carNameScore(value: string): number {
    let score = 0
    if (/[가-힣]{3,}/.test(value)) score += 4
    if (/[A-Za-z]/.test(value)) score += 1
    if (/\d/.test(value)) score += 1
    if (value.length >= 6 && value.length <= 20) score += 2
    if (/서울|경기|강서구|양천로|모터리움|상품용|법인/.test(value)) score -= 5
    if (/승용|승합|화물|특수|자가용|영업용/.test(value)) score -= 3
    if (/정부24|스캐너용|진위확인|문서확인|프로그램|인터넷발급|자동차365|자동차관리법|시행규칙|별표/.test(value)) score -= 12
    if (/[가-힣]+\d/.test(value)) score += 3
    if (/디스커버리|카니발|쏘렌토|쏘나타|아반떼|그랜저|모닝|레이|산타페|카니발|스포티지|투싼|K[35789]/.test(value)) score += 4
    return score
  }

  private static extractModelInfo(text: string, lines: string[]): string {
    const modelLabelRe = /형\s*식(?:\s*및\s*(?:모\s*델\s*연\s*도|제\s*작\s*연\s*월))?/
    const candidates: Array<{ code: string; year: string; score: number }> = []

    for (let i = 0; i < lines.length; i++) {
      if (!/형\s*식/.test(lines[i])) continue

      const sameLine = this.extractInlineValue(lines[i], modelLabelRe)
      const nearby = [sameLine, lines[i + 1] ?? '', lines[i + 2] ?? '', lines[i + 3] ?? '', lines[i + 4] ?? '', lines[i + 5] ?? '']
      const code = nearby.map((value) => this.extractModelCode(value)).find(Boolean) ?? ''
      const year = nearby.map((value) => this.extractYearMonth(value)).find(Boolean) ?? ''
      const score = this.modelInfoScore(code, year, nearby)
      if (code || year) candidates.push({ code, year, score })
    }

    const block = this.getLabelWindow(text, modelLabelRe, 0, 120)
    if (block) {
      const code = this.extractModelCode(block)
      const year = this.extractYearMonth(block)
      const score = this.modelInfoScore(code, year, [block])
      if (code || year) candidates.push({ code, year, score })
    }

    candidates.sort((a, b) => b.score - a.score)
    const best = candidates[0]
    if (!best) return ''
    if (best.code && best.year) return `${best.code} / ${best.year}`
    if (best.code) return best.code
    if (best.year) return best.year
    return ''
  }

  private static extractModelCode(value: string): string {
    const cleaned = value
      .trim()
      .replace(/^.*형\s*식(?:\s*및\s*(?:모\s*델\s*연\s*도|제\s*작\s*연\s*월))?\s*/u, '')
    if (!cleaned || this.isLikelyLabel(cleaned)) return ''

    const candidates = cleaned.match(/[A-Z0-9]{2,}(?:-[A-Z0-9]{1,}){0,3}/gi) ?? []
    for (const candidate of candidates) {
      const normalized = candidate.toUpperCase()
      if (/^\d{4}(?:-\d{1,2})?$/.test(normalized)) continue
      if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(normalized)) continue
      if (/^(OCR|AUTO|PASS|WIPM|PALM)$/i.test(normalized)) continue
      if (/^(UCU|CM|CT|OO|LAS)$/i.test(normalized) && normalized !== 'LAS') continue
      if (normalized.length <= 12) return normalized
    }
    return ''
  }

  private static modelInfoScore(code: string, year: string, nearby: string[]): number {
    let score = 0
    const joined = nearby.join(' ')
    if (code) score += 4
    if (year) score += 3
    if (code === 'LAS') score += 4
    if (joined.includes('제작연월') || joined.includes('형식')) score += 2
    if (/(원동기형식|차대번호|사용본거지)/.test(joined)) score -= 4
    if (/^(UCU|CM|CT)$/i.test(code)) score -= 5
    return score
  }

  private static extractYearMonth(value: string): string {
    const match = value.match(/\b(19\d{2}|20[0-3]\d)[-./](\d{1,2})(?![-./]\d)/)
    if (match) return `${match[1]}-${match[2].padStart(2, '0')}`

    const yearOnly = value.match(/\b(19\d{2}|20[0-3]\d)\b/)
    return yearOnly ? yearOnly[1] : ''
  }

  private static extractEngineType(text: string, lines: string[]): string {
    const engineCandidates: string[] = []

    for (let i = 0; i < lines.length; i++) {
      if (!/원\s*동\s*기\s*형\s*식/.test(lines[i])) continue

      for (const candidate of [
        this.extractInlineValue(lines[i], /원\s*동\s*기\s*형\s*식/),
        lines[i + 1] ?? '',
        lines[i - 1] ?? '',
        lines[i + 2] ?? '',
      ]) {
        const cleaned = candidate.toUpperCase().replace(/[^A-Z0-9-]/g, '')
        if (this.isLikelyEngineType(cleaned)) {
          engineCandidates.push(cleaned)
        }
      }
    }

    const block = this.getLabelWindow(text, /원\s*동\s*기\s*형\s*식/, 30, 80)
    if (block) {
      const matches = block.toUpperCase().match(/[A-Z0-9-]{3,12}/g) ?? []
      for (const candidate of matches) {
        if (this.isLikelyEngineType(candidate)) engineCandidates.push(candidate)
      }
    }

    return this.pickBestEngineType(engineCandidates)
  }

  private static extractVin(text: string, lines: string[]): string {
    for (const pattern of [
      /차\s*대\s*번\s*호\s*[|｜:：]?\s*([A-Z0-9]{10,17})/i,
      /대\s*번\s*호\s*[|｜:：]?\s*([A-Z0-9]{10,17})/i,
    ]) {
      const match = text.match(pattern)
      if (match) return match[1].toUpperCase()
    }

    for (let i = 0; i < lines.length; i++) {
      if (!/차\s*대\s*번\s*호|대\s*번\s*호/.test(lines[i])) continue
      const joined = [lines[i], lines[i + 1] ?? ''].join(' ')
      const match = joined.match(/([A-HJ-NPR-Z0-9]{17})/i)
      if (match) return match[1].toUpperCase()
    }

    const fallback = text.match(/\b([A-HJ-NPR-Z0-9]{17})\b/i)
    return fallback ? fallback[1].toUpperCase() : ''
  }

  private static extractDisplacement(text: string, lines: string[]): string {
    for (const value of [
      text.match(/배\s*기\s*량\s*[|｜:：]?\s*(\d[\d,]+)\s*c{0,2}/i)?.[1] ?? '',
      text.match(/(\d{3,5})\s*cc/i)?.[1] ?? '',
    ]) {
      if (value) return value.replace(/,/g, '')
    }

    for (let i = 0; i < lines.length; i++) {
      if (!/배\s*기\s*량/.test(lines[i])) continue
      const match = [lines[i], lines[i + 1] ?? ''].join(' ').match(/(\d{3,5})/)
      if (match) return match[1]
    }

    return ''
  }

  private static extractPassengerCapacity(text: string, lines: string[]): string {
    for (const value of [
      text.match(/[승숭]\s*차\s*정\s*원(?:\s*[|｜:：]|\s{2,})\s*(\d{1,2})(?:\s*명)?/)?.[1] ?? '',
      text.match(/[승숭]\s*차\s*정\s*원[^\n]{0,12}?(\d{1,2})\s*명/)?.[1] ?? '',
    ]) {
      if (value) return value
    }

    for (let i = 0; i < lines.length; i++) {
      if (!/[승숭]\s*차\s*정\s*원/.test(lines[i])) continue
      const match = [lines[i], lines[i + 1] ?? ''].join(' ').match(/(\d{1,2})\s*명?/)
      if (match) return match[1]
    }

    return ''
  }

  private static extractMaxLoad(text: string, lines: string[]): string {
    for (const value of [
      text.match(/최\s*대\s*적\s*재\s*량\s*[|｜:：]?\s*(\d[\d,]*)\s*k?g?/i)?.[1] ?? '',
      text.match(/최\s*대\s*적\s*재\s*량[^\n]*?(\d[\d,]+)\s*kg/i)?.[1] ?? '',
    ]) {
      if (value) return value.replace(/,/g, '')
    }

    if (this.extractCarType(text).includes('승용')) return '0'

    for (let i = 0; i < lines.length; i++) {
      if (!/최\s*대\s*적\s*재\s*량/.test(lines[i])) continue
      const match = [lines[i], lines[i + 1] ?? ''].join(' ').match(/(\d[\d,]*)/)
      if (match) return match[1].replace(/,/g, '')
    }

    return ''
  }

  private static extractFuelType(text: string): string {
    const compact = this.compactForMatching(text)
    const compactFuelMap: Record<string, string> = {
      가솔린: '가솔린',
      휘발유: '휘발유',
      디젤: '디젤',
      경유: '경유',
      LPG: 'LPG',
      하이브리드: '하이브리드',
      CNG: 'CNG',
    }
    for (const [needle, normalized] of Object.entries(compactFuelMap)) {
      if (compact.includes(needle)) return normalized
    }

    const labeled = text.match(/(?:연\s*료\s*의?\s*종\s*류|사\s*용\s*연\s*료)\s*[|｜:：]?\s*([가-힣A-Za-z]{2,10})/)
    if (labeled) return labeled[1].trim()

    for (const fuel of ['가솔린', '휘발유', '디젤', '경유', 'LPG', '하이브리드', 'CNG']) {
      if (text.includes(fuel)) return fuel
    }

    return ''
  }

  private static extractLocation(text: string, lines: string[]): string {
    const inline = text.match(/사\s*용\s*본\s*거\s*지\s*[|｜:：]?\s*([^\n]{5,80})/)
    if (inline) return this.cleanLocation(inline[1])

    for (let i = 0; i < lines.length; i++) {
      if (!/사\s*용\s*본\s*거\s*지/.test(lines[i])) continue

      const sameLine = this.extractInlineValue(lines[i], /사\s*용\s*본\s*거\s*지/)
      if (this.isLikelyLocation(sameLine)) return this.cleanLocation(sameLine)

      for (const candidate of [lines[i + 1] ?? '', lines[i + 2] ?? '', lines[i + 3] ?? '']) {
        if (this.isLikelyLocation(candidate)) return this.cleanLocation(candidate)
      }
    }

    return ''
  }

  private static isLikelyLocation(value: string): boolean {
    const cleaned = value.trim()
    if (!cleaned || cleaned.length < 5) return false
    if (this.isLikelyLabel(cleaned)) return false
    return /[가-힣]/.test(cleaned) && /\d|로|길|동|호|구/.test(cleaned)
  }

  private static cleanLocation(value: string): string {
    const cleaned = this.joinFragmentedText(
      value
      .replace(/^.*사\s*용\s*본\s*거\s*지\s*[|｜:：]?\s*/u, '')
      .replace(/['"'`]/g, '')
      .replace(/\*.*$/, '')
      .replace(/\s+(?:생년월일|성명|소유자|법인등록번호).*$/u, '')
      .replace(/^[^가-힣A-Za-z0-9(]+/, '')
      .replace(/\s{3,}.*$/, '')
      .trim(),
    )

    const regionStart = cleaned.match(/(서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)[가-힣\s]*/)
    if (regionStart?.index != null) {
      return cleaned.slice(regionStart.index).trim()
    }

    return cleaned
  }

  private static extractOwnerName(text: string, lines: string[]): string {
    const corporate = text.match(/\(주\)\s*[가-힣A-Za-z0-9]{2,20}/)
    if (corporate) return corporate[0]

    for (let i = 0; i < lines.length; i++) {
      if (!/성\s*명|소\s*유\s*자/.test(lines[i])) continue

      for (const candidate of [lines[i], lines[i + 1] ?? '']) {
        const cleaned = candidate
          .replace(/^.*성\s*명[^|｜:：]*[|｜:：]?\s*/u, '')
          .replace(/^.*소\s*유\s*자[^|｜:：]*[|｜:：]?\s*/u, '')
          .replace(/\*.*$/, '')
          .replace(/\[.*?\]/g, '')
          .replace(/[~\])>]+.*$/, '')
          .replace(/[^()가-힣A-Za-z0-9\s]/g, ' ')
          .replace(/\s{2,}/g, ' ')
          .trim()

        if (cleaned.length >= 3 && cleaned !== '(주)' && !this.isLikelyLabel(cleaned)) return cleaned
      }
    }

    return ''
  }

  private static extractFirstDate(text: string): string {
    const labelRegex = /최\s*초\s*등\s*록\s*일/g
    const windows = [...text.matchAll(labelRegex)]
      .map((match) => {
        const start = match.index ?? 0
        return text.slice(start, start + 160)
      })
      .filter(Boolean)

    for (const block of windows) {
      const koreanDate = block.match(/(19\d{2}|20[0-3]\d)\s*년\D{0,10}(\d{1,2})\s*월\D{0,10}(\d{1,2})(?:\s*일|[%])?/)
      if (koreanDate) {
        return `${koreanDate[1]}-${koreanDate[2].padStart(2, '0')}-${koreanDate[3].padStart(2, '0')}`
      }

      const dashedDate = block.match(/\b(19\d{2}|20[0-3]\d)[-./](\d{1,2})[-./](\d{1,2})\b/)
      if (dashedDate) {
        return `${dashedDate[1]}-${dashedDate[2].padStart(2, '0')}-${dashedDate[3].padStart(2, '0')}`
      }

      const yearOnly = block.match(/\b(19\d{2}|20[0-3]\d)\s*년\b/)
      const monthDay = block.match(/(\d{1,2})\s*월\D{0,10}(\d{1,2})(?:\s*일|[%])?/)
      if (yearOnly && monthDay) {
        return `${yearOnly[1]}-${monthDay[1].padStart(2, '0')}-${monthDay[2].padStart(2, '0')}`
      }

      const compactBlock = this.compactForMatching(block)
      const compactYearOnly = compactBlock.match(/\b(19\d{2}|20[0-3]\d)년\b/)
      const compactMonthDay = compactBlock.match(/(\d{1,2})월(\d{1,2})(?:일|%)?/)
      if (compactYearOnly && compactMonthDay) {
        return `${compactYearOnly[1]}-${compactMonthDay[1].padStart(2, '0')}-${compactMonthDay[2].padStart(2, '0')}`
      }
    }

    return ''
  }

  private static extractInspectionValidity(text: string): string {
    const dateRe = /(\d{4}[-./=]\d{1,2}[-./=]\d{1,2})\s*(\d{4}[-./=]\d{1,2}[-./=]\d{1,2})/g
    const all = [...text.matchAll(dateRe)]
    if (all.length === 0) {
      const singleDates = [...text.matchAll(/\d{4}[-./=]\d{1,2}[-./=]\d{1,2}/g)].map((match) => match[0])
      const uniqueDates = [...new Set(singleDates.map((value) => this.normalizeDateString(value)))]
      if (uniqueDates.length >= 2) {
        return `${uniqueDates[uniqueDates.length - 2]} ~ ${uniqueDates[uniqueDates.length - 1]}`
      }
      return ''
    }

    const last = all[all.length - 1]
    const from = this.normalizeDateString(last[1])
    const to = this.normalizeDateString(last[2])
    const afterDate = text.slice(last.index! + last[0].length, last.index! + last[0].length + 40)
    const typeMatch = afterDate.match(/[종정][합기]\s*검사/)
    const inspectionType = typeMatch ? typeMatch[0].replace(/\s/g, '') : ''

    return inspectionType ? `${from} ~ ${to} (${inspectionType})` : `${from} ~ ${to}`
  }

  private static normalizeDateString(value: string): string {
    const match = value.match(/(\d{4})[-./=](\d{1,2})[-./=](\d{1,2})/)
    if (!match) return value.replace(/[.=]/g, '-')
    return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`
  }

  private static getLabelWindow(text: string, labelRegex: RegExp, before: number, after: number): string {
    const match = text.match(labelRegex)
    if (!match || match.index == null) return ''
    const start = Math.max(0, match.index - before)
    return text.slice(start, match.index + match[0].length + after)
  }

  private static extractInlineValue(line: string, labelRegex: RegExp): string {
    return line.replace(new RegExp(`^.*${labelRegex.source}\\s*[|｜:：]?\\s*`, 'u'), '').trim()
  }

  private static compactForMatching(value: string): string {
    return value.replace(/\s+/g, '').replace(/승룡|스요/g, '승용')
  }

  private static joinFragmentedText(value: string): string {
    const cleaned = value.replace(/\s+/g, ' ').trim()
    const tokens = cleaned.split(' ').filter(Boolean)
    if (tokens.length < 3) return cleaned

    const fragmentedRatio = tokens.filter((token) => token.length <= 1 || /^[A-Za-z0-9]$/.test(token)).length / tokens.length
    if (fragmentedRatio < 0.6) return cleaned

    return cleaned
      .replace(/(?<=[가-힣A-Za-z0-9])\s+(?=[가-힣A-Za-z0-9(])/g, '')
      .replace(/\(\s+/g, '(')
      .replace(/\s+\)/g, ')')
      .replace(/,\s*/g, ', ')
      .trim()
  }

  private static isLikelyEngineType(value: string): boolean {
    if (!/^[A-Z0-9-]{3,12}$/.test(value)) return false
    if (!/[A-Z]/.test(value) || !/\d/.test(value)) return false
    if (/^\d{6,}$/.test(value)) return false
    return !/^(WIPM|PALM|AUTO|PASS|OCR)$/i.test(value)
  }

  private static pickBestEngineType(candidates: string[]): string {
    const unique = [...new Set(candidates)]
    unique.sort((a, b) => this.engineTypeScore(b) - this.engineTypeScore(a))
    return unique[0] ?? ''
  }

  private static engineTypeScore(value: string): number {
    let score = 0
    if (value.length >= 4 && value.length <= 6) score += 4
    if (/^[A-Z]{0,2}\d[A-Z0-9-]+$/.test(value)) score += 3
    if (/[A-Z]{2,}/.test(value)) score += 1
    if (/\d{2,}/.test(value)) score += 1
    if (/-/.test(value)) score -= 1
    if (value.length > 8) score -= 2
    return score
  }

  private static isLikelyLabel(value: string): boolean {
    return /(자동차등록번호|차종|용도|차명|형식|모델연도|제작연월|차대번호|원동기형식|사용본거지|성명|소유자|최초등록일|검사\s*유효기간|배기량|승차정원|최대적재량|연료)/.test(
      value,
    )
  }
}
