import { IsString, IsInt, Min } from 'class-validator';

export class SeedInventoryDto {
  @IsString()
  productId: string;

  @IsInt()
  @Min(0)
  quantity: number;
}
