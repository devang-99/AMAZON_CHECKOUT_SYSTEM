export interface OrderCreatedEvent {
  eventId: string;
  orderId: string;
  customerId: string;
  totalAmount: number;
  createdAt?: string;
}

export interface OrderBilledEvent {
  eventId: string;
  orderId: string;
  customerId: string;
  amount: number;
  billedAt: string;
}

export interface PaymentFailedEvent {
  eventId: string;
  orderId: string;
  customerId: string;
  amount: number;
  reason: string;
  failedAt: string;
}

export interface OrderRefundedEvent {
  eventId: string;
  orderId: string;
  customerId: string;
  amount: number;
  refundedAt: string;
}
