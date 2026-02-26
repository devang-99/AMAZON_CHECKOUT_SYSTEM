import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' } })
export class OrdersGateway {
  @WebSocketServer()
  server: Server;

  orderCreated(order: any) {
    this.server.emit('order.created', order);
  }

  orderUpdated(order: any) {
    this.server.emit('order.updated', order);
  }
}
