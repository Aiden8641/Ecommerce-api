import { createClient } from 'redis';
import { configDotenv } from 'dotenv';

configDotenv()

export const client = createClient({
  username: 'default',
  password: process.env.REDIS_DB_PASSWORD,
  socket: {
    host: 'redis-11260.c8.us-east-1-3.ec2.redns.redis-cloud.com',
    port: 11260
  }
});

client.on('error', err => console.log('Redis Client Error', err));

export const connectRedis = async () => {
  await client.connect();
}

export const disconnectRedis = async () => {
  await client.close()
}

