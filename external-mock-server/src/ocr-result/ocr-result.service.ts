import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { Cron, CronExpression } from '@nestjs/schedule'
import type { CreateOcrResultDto } from './dto/create-ocr-result.dto'

const MAX_TTL_HOURS = 72

@Injectable()
export class OcrResultService {
  private readonly prisma = new PrismaClient()

  async create(dto: CreateOcrResultDto) {
    const ttlHours = Math.min(
      parseInt(process.env.OCR_RESULT_TTL_HOURS ?? '24', 10),
      MAX_TTL_HOURS,
    )

    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000)

    const existing = await this.prisma.ocrResult.findUnique({
      where: { receiptId: dto.receiptId },
    })

    if (existing) {
      throw new ConflictException(`receiptId '${dto.receiptId}' already exists`)
    }

    return this.prisma.ocrResult.create({
      data: {
        receiptId: dto.receiptId,
        mappedData: dto.mappedData,
        confidence: dto.confidence,
        status: dto.status,
        expiresAt,
      },
    })
  }

  async findByReceiptId(receiptId: string) {
    const result = await this.prisma.ocrResult.findUnique({
      where: { receiptId },
    })

    if (!result) {
      throw new NotFoundException(`receiptId '${receiptId}'를 찾을 수 없습니다.`)
    }

    if (result.expiresAt < new Date()) {
      throw new NotFoundException(`receiptId '${receiptId}'가 만료되었습니다.`)
    }

    return result
  }

  // 1시간마다 만료된 레코드 삭제
  @Cron(CronExpression.EVERY_HOUR)
  async deleteExpired() {
    const deleted = await this.prisma.ocrResult.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    })

    if (deleted.count > 0) {
      console.log(`[Scheduler] 만료된 OCR 결과 ${deleted.count}건 삭제`)
    }
  }
}
