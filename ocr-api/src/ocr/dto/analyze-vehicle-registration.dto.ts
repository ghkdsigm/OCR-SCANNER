import { IsNotEmpty, IsString, IsUUID } from 'class-validator'

export class AnalyzeVehicleRegistrationDto {
  @IsUUID()
  @IsNotEmpty()
  receiptId: string
}
