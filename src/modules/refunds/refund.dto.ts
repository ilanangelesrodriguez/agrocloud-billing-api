import { IsIn, IsString, Matches } from 'class-validator';
export class RefundDto {
  @IsString() @Matches(/^[A-Za-z0-9_-]{8,36}$/) externalReference!: string;
  @IsString() @IsIn(['duplicado', 'fraudulento', 'solicitud_comprador']) reason!: string;
}
