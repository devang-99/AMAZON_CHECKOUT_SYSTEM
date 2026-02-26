import 'dotenv/config';

const url = process.env.RABBITMQ_URL;
const exchange = process.env.RABBITMQ_EXCHANGE;

if (!url) throw new Error('RABBITMQ_URL not defined');
if (!exchange) throw new Error('RABBITMQ_EXCHANGE not defined');

export const rabbitmqConfig = {
  url,
  exchange,
  queues: {
    billing: 'billing-service-queue',
    sales: 'sales-service-queue',
  },
  routingKeys: {
    orderCreated: 'order.created',
    orderBilled: 'order.billed',
    paymentFailed: 'payment.failed',
    orderRefundRequested: 'order.refund.requested',
    orderRefunded: 'order.refunded',
  },
};
