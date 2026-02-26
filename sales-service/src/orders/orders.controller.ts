import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Delete,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Controller('orders')
export class OrdersController {
  constructor(private readonly service: OrdersService) {}

  @Post()
  create(@Body() dto: CreateOrderDto) {
    return this.service.createOrder(dto.customerId, dto.items);
  }

  @Get()
  findAll() {
    return this.service.getAllOrders();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.getOrder(id);
  }

  @Delete('reset')
  reset() {
    return this.service.resetDatabase();
  }
}