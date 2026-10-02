import { Queue } from "bullmq";
import IORedis from "ioredis";

const connection = new IORedis("redis://127.0.0.1:6379", {
    maxRetriesPerRequest: null,
});

const queue = new Queue("review-queue", {
    connection,
});

async function test() {
    const job = await queue.add("test-job", {
        message: "Hello from NEXUS",
    });

    console.log("✅ Job added:", job.id);

    const counts = await queue.getJobCounts(
        "waiting",
        "active",
        "completed",
        "failed"
    );

    console.log("📊 Queue counts:", counts);

    await connection.quit();
}

test();