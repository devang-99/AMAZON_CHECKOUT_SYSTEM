import { IsString, IsNumber, Min } from 'class-validator';

export class OrderItemDto {
  @IsString()
  productId: string;

  @IsNumber()
  @Min(1)
  quantity: number;
}