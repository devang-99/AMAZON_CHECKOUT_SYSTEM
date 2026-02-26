import { IsString, IsArray, ValidateNested, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

class ShipmentItemDto {
  @IsString()
  productId: string;

  @IsInt()
  quantity: number;
}

export class CreateShipmentDto {
  @IsString()
  orderId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ShipmentItemDto)
  items: ShipmentItemDto[];
}
