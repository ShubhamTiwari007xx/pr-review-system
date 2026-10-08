// Express typings are unavailable in this project; keep the existing runtime import.
import "dotenv/config";
import { reviewQueue } from "./queue";
// @ts-expect-error Express has no installed declaration file.
import express from "express";
import crypto from "crypto";
import { prisma } from "./src/db";
const app = express();
const PORT = 3000;

// Keep the raw request body for GitHub signature verification
app.use(
  express.json({
    verify: (req, res, buf) => {
      (req as any).rawBody = buf;
    },
  }),
);

// 🔐 Verify GitHub webhook signature
function verifyGitHubSignature(req: any) {
  const signature = req.headers["x-hub-signature-256"];

  if (!signature) {
    return false;
  }

  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  console.log("🔐 Verifying GitHub signature...");

  if (!secret) {
    console.error("❌ GITHUB_WEBHOOK_SECRET is missing");
    return false;
  }

  const expectedSignature =
    "sha256=" +
    crypto.createHmac("sha256", secret).update(req.rawBody).digest("hex");

  if (signature.length !== expectedSignature.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature),
  );
}

// 🚀 GitHub webhook
app.post("/webhook", async (req, res) => {
  // 1️⃣ Verify signature
  if (!verifyGitHubSignature(req)) {
    console.log("❌ Invalid GitHub signature");
    return res.status(401).send("Invalid signature");
  }

  console.log("✅ GitHub signature verified!");

  // 2️⃣ Check event
  const event = req.headers["x-github-event"];

  if (event !== "pull_request") {
    console.log("⚠️ Ignored event:", event);
    return res.status(200).send("Event ignored");
  }

  // 3️⃣ Get PR information
  const { action, pull_request, repository } = req.body;

  // 4️⃣ Only process useful PR actions
  const allowedActions = ["opened", "synchronize", "reopened"];

  if (!allowedActions.includes(action)) {
    console.log("⚠️ Ignored action:", action);
    return res.status(200).send("Action ignored");
  }

  // 5️⃣ Extract review data
  const repo = repository.full_name;
  const prNumber = pull_request.number;
  const diffUrl = pull_request.diff_url;

  console.log("🔥 PR Webhook received!");
  console.log("Repo:", repo);
  console.log("Action:", action);
  console.log("PR Number:", prNumber);
  console.log("Diff URL:", diffUrl);

  // 6️⃣ Save to Supabase through Prisma
  try {
    const review = await prisma.review.create({
      data: {
        repo,
        prNumber,
        action,
        diffUrl,
      },
    });
   await reviewQueue.add(
    "review-pr",
    {
        reviewId: review.id,
        repo,
        prNumber,
        diffUrl,
    },
    {
        attempts: 3,
        backoff: {
            type: "exponential",
            delay: 2000,
        },
    }
);

    console.log("📨 Review job added!");
    // console.log("🆔 BullMQ Job ID:", job.id);
    console.log("📨 Review job added to queue!");
    console.log("🗄️ Review saved to database!");
    console.log("Review ID:", review.id);
    console.log("Status:", review.status);

    return res.status(200).send("Review created");
  } catch (error) {
    console.error("❌ Database error:");
    console.error(error);

    return res.status(500).send("Database error");
  }
});

app.listen(PORT, () => {
  console.log(`🚀 NEXUS server running on port ${PORT}`);
});

