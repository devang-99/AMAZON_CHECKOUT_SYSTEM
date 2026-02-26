import 'dotenv/config';

const url = process.env.RABBITMQ_URL;
const exchange = process.env.RABBITMQ_EXCHANGE;

if (!url) {
  throw new Error('RABBITMQ_URL is not defined in environment');
}

if (!exchange) {
  throw new Error('RABBITMQ_EXCHANGE is not defined in environment');
}

export const rabbitConfig = {
  url,
  exchange,
};
