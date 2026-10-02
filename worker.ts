import IORedis from "ioredis";
import { Worker } from "bullmq";
import { prisma } from "./src/db";
import {
  fetchPullRequestDiff,
  postPullRequestComment,
} from "./src/github/github";
import { reviewWithOllama } from "./src/ai/ollama";
const connection = new IORedis("redis://127.0.0.1:6379", {
  maxRetriesPerRequest: null,
});

const worker = new Worker(
  "review-queue",
  async (job) => {
    const { reviewId, repo, prNumber, diffUrl } = job.data;

    console.log("🔥 Processing review job!");
    console.log("Review ID:", reviewId);
    console.log("Repo:", repo);
    console.log("PR Number:", prNumber);

    try {
      await prisma.review.update({
        where: { id: reviewId },
        data: { status: "processing" },
      });

      console.log("✅ Review status updated to processing");

      const diff = await fetchPullRequestDiff(diffUrl);

      console.log("📄 Diff fetched!");
      console.log("📏 Diff length:", diff.length);
      console.log("🤖 Sending diff to Ollama...");

      const review = await reviewWithOllama(diff);

      console.log("✅ AI review completed!");
      console.log(JSON.stringify(review, null, 2));

      await prisma.review.update({
        where: { id: reviewId },
        data: {
          aiSummary: review.summary,
          aiIssues: review.issues,
        },
      });

      console.log("💾 AI review saved to PostgreSQL!");

      const issueCount = review.issues.length;

      const severityEmoji: Record<string, string> = {
        high: "🔴",
        medium: "🟡",
        low: "🔵",
      };

      const issuesSection =
        issueCount === 0
          ? "### ✅ No significant issues found\n\nNEXUS did not identify any meaningful problems in this change."
          : `
### 🚨 Issues Found: ${issueCount}

${review.issues
  .map(
    (issue, index) => `
#### ${index + 1}. ${severityEmoji[issue.severity]} ${issue.severity.toUpperCase()}

**Issue:**  
${issue.description}

**💡 Suggested Fix:**  
${issue.suggestion}
`,
  )
  .join("\n")}
`;

      const comment = `
# 🤖 NEXUS AI Review

## 📋 Summary

${review.summary}

${issuesSection}

---

*Generated automatically by NEXUS*
`;

      const existingReview = await prisma.review.findUnique({
        where: { id: reviewId },
      });

      if (existingReview?.githubCommentId) {
        console.log("⏭️ GitHub comment already exists. Skipping...");
      } else {
        const commentResponse = await postPullRequestComment(
          repo,
          prNumber,
          comment,
        );

        await prisma.review.update({
          where: { id: reviewId },
          data: {
            githubCommentId: String(commentResponse.id),
          },
        });

        console.log("💬 AI review posted to GitHub!");
      }
    } catch (error) {
      console.error("❌ Review processing failed!");

      const attempts = job.opts.attempts ?? 1;
      const currentAttempt = job.attemptsMade + 1;

      console.error(`Attempt ${currentAttempt}/${attempts}`);

      console.error(error instanceof Error ? error.message : error);

      // Only permanently mark the review as failed
      // after the final BullMQ attempt.
      if (currentAttempt >= attempts) {
        await prisma.review.update({
          where: { id: reviewId },
          data: { status: "failed" },
        });

        console.log("🔴 Review permanently failed!");
      }

      // IMPORTANT:
      // Rethrow so BullMQ knows the job failed
      // and can perform its retry.
      throw error;
    }
  },
  { connection },
);
worker.on("failed", (job, err) => {
  console.log(`❌ Job ${job?.id} failed!`);
  console.log("Attempt:", job?.attemptsMade);
  console.log("Error:", err.message);
});
