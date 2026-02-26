import { IsString } from 'class-validator';

export class RefundDto {
  @IsString()
  orderId: string;
}
