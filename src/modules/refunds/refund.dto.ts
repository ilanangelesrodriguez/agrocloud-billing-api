import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsString, Matches } from "class-validator";
export class RefundDto {
  @ApiProperty({ example: "AGRO-ORDER-000125" })
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{8,36}$/)
  externalReference!: string;
  @ApiProperty({
    enum: ["duplicado", "fraudulento", "solicitud_comprador"],
    example: "solicitud_comprador",
  })
  @IsString()
  @IsIn(["duplicado", "fraudulento", "solicitud_comprador"])
  reason!: string;
}
