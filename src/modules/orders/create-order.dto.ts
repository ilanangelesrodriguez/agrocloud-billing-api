import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsIn, IsInt, IsNotEmpty, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
export class CreateOrderDto {
  @ApiProperty({ example: 'AGRO-ORDER-000125' })
  @IsString() @Matches(/^[A-Za-z0-9_-]{8,36}$/) externalReference!: string;
  @ApiProperty({ example: 25 })
  @IsInt() @Min(1) companyId!: number;
  @ApiProperty({ enum: ['PLAN', 'RENEWAL', 'USER_ADDON', 'AI_ADDON', 'LOT_ADDON'] })
  @IsIn(['PLAN', 'RENEWAL', 'USER_ADDON', 'AI_ADDON', 'LOT_ADDON']) kind!: string;
  @ApiProperty({ example: 7900, description: 'Céntimos, no soles.' })
  @IsInt() @Min(100) @Max(999900) amountCents!: number;
  @ApiProperty({ example: 'PEN' })
  @IsIn(['PEN']) currency!: 'PEN';
  @IsEmail() customerEmail!: string;
  @IsString() @IsNotEmpty() @MaxLength(80) description!: string;
}
