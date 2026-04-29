import { IsNotEmpty, IsNumber, IsObject, IsString, IsUUID, Max, Min } from 'class-validator'

export class CreateOcrResultDto {
  @IsUUID()
  receiptId: string

  @IsObject()
  @IsNotEmpty()
  mappedData: Record<string, unknown>

  @IsNumber()
  @Min(0)
  @Max(1)
  confidence: number

  @IsString()
  @IsNotEmpty()
  status: string
}
