import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';
export class CreateChargeDto {
  @ApiProperty({ example: 'AGRO-ORDER-000125' })
  @IsString() @Matches(/^[A-Za-z0-9_-]{8,36}$/) externalReference!: string;
  @ApiProperty({ example: 'tkn_test_xxxxx', description: 'Token generado por Culqi Custom Checkout; NO datos de tarjeta' })
  @IsString() @Matches(/^tkn_(test|live)_[A-Za-z0-9]+$/) tokenId!: string;
}
