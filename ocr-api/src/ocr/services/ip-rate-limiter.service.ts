import { Injectable } from '@nestjs/common'

interface IpDailyUsage {
  date: string
  requeryCount: number
}

export interface RequeryUsageDecision {
  requeryAttemptNumber: number
  useGoogleVision: boolean
}

@Injectable()
export class IpRateLimiterService {
  private readonly store = new Map<string, IpDailyUsage>()

  private today(): string {
    return new Date().toISOString().slice(0, 10)
  }

  private getEntry(ip: string): IpDailyUsage {
    const today = this.today()
    const existing = this.store.get(ip)
    if (!existing || existing.date !== today) {
      const entry: IpDailyUsage = { date: today, requeryCount: 0 }
      this.store.set(ip, entry)
      return entry
    }
    return existing
  }

  registerRequeryAttempt(ip: string): RequeryUsageDecision {
    const entry = this.getEntry(ip)
    entry.requeryCount += 1

    return {
      requeryAttemptNumber: entry.requeryCount,
      // 최초 분석은 기본 OCR이므로, 첫 재조회부터 13번째 재조회까지가 전체 2~14회에 해당한다.
      useGoogleVision: entry.requeryCount >= 1 && entry.requeryCount <= 13,
    }
  }

  getRequeryCount(ip: string): number {
    return this.getEntry(ip).requeryCount
  }
}
