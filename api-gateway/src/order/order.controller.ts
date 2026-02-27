/* eslint-disable */

import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import axios from 'axios';

@Controller('api/v1')
export class GatewayController {



  @Post('orders')
  async createOrder(@Body() body: any) {
    try {
      const response = await axios.post(
        'http://sales-service:3001/orders',
        {
          customerId: body.customerId,
          items: body.items,
        },
      );

      return response.data;
    } catch (error: any) {
      throw new HttpException(
        error?.response?.data || 'Sales service error',
        error?.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('orders')
  async getAllOrders() {
    try {
      const response = await axios.get(
        'http://sales-service:3001/orders',
      );
      return response.data;
    } catch (error: any) {
      throw new HttpException(
        error?.response?.data || 'Sales service error',
        error?.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('orders/:id')
  async getOrder(@Param('id') id: string) {
    try {
      const response = await axios.get(
        `http://sales-service:3001/orders/${id}`,
      );
      return response.data;
    } catch (error: any) {
      throw new HttpException(
        error?.response?.data || 'Sales service error',
        error?.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }


  @Post('billing/accounts/seed')
  async seedAccount(@Body() body: any) {
    const response = await axios.post(
      'http://billing-service:4001/billing/accounts/seed',
      body,
    );
    return response.data;
  }

}