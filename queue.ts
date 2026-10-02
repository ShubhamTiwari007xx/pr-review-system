import { Queue } from "bullmq";
import IORedis from "ioredis";

const connection = new IORedis("redis://127.0.0.1:6379", {
    maxRetriesPerRequest: null,
});

export const reviewQueue = new Queue("review-queue", {
    connection,
});

console.log("📦 Review queue connected to Redis");