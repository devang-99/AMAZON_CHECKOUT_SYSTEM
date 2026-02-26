export interface OrderCreatedEvent {
  eventId: string;
  orderId: string;
  customerId: string;
  items: {
    productId: string;
    quantity: number;
    unitPrice: number;
  }[];
  totalAmount: number;
}