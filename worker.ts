import IORedis from "ioredis";
import { Worker } from "bullmq";

import { prisma } from "./src/db";
import { parseDiff } from "./src/diff-parser";
import { getCodeContext } from "./src/review context";
import { validateReview } from "./src/ai/validate.review";
import {
  fetchPullRequestDiff,
  getPullRequest,
  postPullRequestComment,
  downloadRepositoryArchive,
 
} from "./src/github/github";

import { extractRepositoryArchive , getRepositoryRoot} from "./src/github/extract-repository";
import { buildRepositoryGraph } from "./src/architecture/scanner";
import { reviewWithOllama } from "./src/ai/ollama";

const connection = new IORedis("redis://127.0.0.1:6379", {
  maxRetriesPerRequest: null,
});

const worker = new Worker(
  "review-queue",

  async (job) => {
    const {
      reviewId,
      repo,
      prNumber,
      diffUrl,
    } = job.data;

    console.log("🔥 Processing review job!");
    console.log("Review ID:", reviewId);
    console.log("Repo:", repo);
    console.log("PR Number:", prNumber);

    try {
      // ----------------------------------------
      // 1. Mark review as processing
      // ----------------------------------------

      await prisma.review.update({
        where: { id: reviewId },
        data: {
          status: "processing",
        },
      });

      console.log("✅ Review status updated to processing");

      // ----------------------------------------
      // 2. Fetch GitHub PR diff
      // ----------------------------------------

      const diff = await fetchPullRequestDiff(diffUrl);

      console.log("📄 Diff fetched!");
      console.log("📏 Diff length:", diff.length);

      // ----------------------------------------
      // 3. Parse changed files and lines
      // ----------------------------------------

      const changedFiles = parseDiff(diff);
      console.log("========== RAW DIFF ==========");
console.log(diff);
console.log("========== END RAW DIFF ==========");

      console.log("🧩 Changed files parsed!");

      console.log(
        JSON.stringify(changedFiles, null, 2)
      );

      if (changedFiles.length === 0) {
        throw new Error(
          "No changed files found in the PR diff"
        );
      }
        
      console.log("🏗️ Fetching pull request information...");

const pullRequest = await getPullRequest(
  repo,
  prNumber
);

const headSha = pullRequest.head.sha;

console.log("🔖 PR head SHA:", headSha);

console.log("📦 Downloading repository archive...");

const repositoryArchive =
  await downloadRepositoryArchive(
    repo,
    headSha
  );

console.log(
  "📦 Repository archive downloaded!"
);

console.log(
  "📏 Archive size:",
  repositoryArchive.length
);

console.log(
  "📂 Extracting repository archive..."
);

const extractedRepositoryPath =
  extractRepositoryArchive(
    repositoryArchive
  );

const repositoryRoot =
  getRepositoryRoot(
    extractedRepositoryPath
  );

console.log(
  "🏠 Repository root:",
  repositoryRoot
);

for (const changedFile of changedFiles) {
  for (const changedLine of changedFile.changedLines) {
    const context = getCodeContext(
      repositoryRoot,
      changedFile.file,
      changedLine.line
    );

    console.log("========== CODE CONTEXT ==========");
    console.log("File:", changedFile.file);
    console.log("Changed line:", changedLine.line);
    console.log(context);
    console.log("========== END CODE CONTEXT ==========");
  }
}

console.log(
  "🏗️ Building repository architecture graph..."
);

const repositoryGraph =
  buildRepositoryGraph(
    repositoryRoot
  );

console.log(
  "🧩 Components:",
  repositoryGraph.components.length
);

console.log(
  "🔗 Relationships:",
  repositoryGraph.relationships.length
);

      // ----------------------------------------
      // 4. Send structured code to Ollama
      // ----------------------------------------

      console.log(
        "🤖 Sending structured code to Ollama..."
      );

      const review =
        await reviewWithOllama(changedFiles);

      console.log("✅ AI review completed!");

      console.log(
        JSON.stringify(review, null, 2)
      );

      // ----------------------------------------
      // 5. Validate AI response
      // ----------------------------------------

      const validation = validateReview(
        review,
        changedFiles
      );

      const safeIssues =
        validation.validIssues;

      console.log(
        "✅ Valid issues:",
        safeIssues.length
      );

      console.log(
        "❌ Rejected issues:",
        validation.rejectedIssues.length
      );

      // ----------------------------------------
      // 6. Log rejected AI issues
      // ----------------------------------------

      if (
        validation.rejectedIssues.length > 0
      ) {
        console.log(
          "⚠️ Some AI issues were rejected:"
        );

        for (
          const rejected
          of validation.rejectedIssues
        ) {
          console.log(
            `- ${rejected.reason}`
          );
        }
      }

      // ----------------------------------------
      // 7. Save validated AI issues
      // ----------------------------------------

      await prisma.review.update({
        where: { id: reviewId },
        data: {
          aiIssues: safeIssues,
        },
      });

      console.log(
        "💾 AI review saved to PostgreSQL!"
      );

      // ----------------------------------------
      // 8. Build GitHub comment
      // ----------------------------------------

      const severityEmoji: Record<
        string,
        string
      > = {
        high: "🔴",
        medium: "🟡",
        low: "🔵",
      };

      const issuesSection =
        safeIssues.length === 0
          ? `
### ✅ No significant issues found

NEXUS did not identify any meaningful problems in this change.
`
          : `
### 🚨 Issues Found: ${safeIssues.length}

${safeIssues
  .map(
    (issue, index) => `
#### ${index + 1}. ${
      severityEmoji[issue.severity] ?? "⚪"
    } ${issue.severity.toUpperCase()}

**File:** \`${issue.file}\`

**Line:** ${issue.line}

**Issue:**  
${issue.description}

**💡 Suggested Fix:**  
${issue.suggestion}
`
  )
  .join("\n")}
`;

      const comment = `
# 🤖 NEXUS AI Review

## 📋 Summary

NEXUS analyzed the changed code in this pull request.

${issuesSection}

---

*Generated automatically by NEXUS*
`;

      // ----------------------------------------
      // 9. Prevent duplicate GitHub comments
      // ----------------------------------------

      const existingReview =
        await prisma.review.findUnique({
          where: {
            id: reviewId,
          },
        });

      if (
        existingReview?.githubCommentId
      ) {
        console.log(
          "⏭️ GitHub comment already exists. Skipping..."
        );
      } else {
        // ----------------------------------------
        // 10. Post validated review to GitHub
        // ----------------------------------------

        const commentResponse =
          await postPullRequestComment(
            repo,
            prNumber,
            comment
          );

        // ----------------------------------------
        // 11. Save GitHub comment ID
        // ----------------------------------------

        await prisma.review.update({
          where: {
            id: reviewId,
          },
          data: {
            githubCommentId:
              String(commentResponse.id),
          },
        });

        console.log(
          "💬 AI review posted to GitHub!"
        );
      }

      // ----------------------------------------
      // 12. Mark review as done
      // ----------------------------------------

      await prisma.review.update({
        where: {
          id: reviewId,
        },
        data: {
          status: "done",
        },
      });

      console.log(
        "🎉 Review completed successfully!"
      );
    } catch (error) {
      // ----------------------------------------
      // Error handling + BullMQ retry
      // ----------------------------------------

      console.error(
        "❌ Review processing failed!"
      );

      const attempts =
        job.opts.attempts ?? 1;

      const currentAttempt =
        job.attemptsMade + 1;

      console.error(
        `Attempt ${currentAttempt}/${attempts}`
      );

      console.error(
        error instanceof Error
          ? error.message
          : error
      );

      // Only permanently mark the review
      // as failed after the final attempt.
      if (
        currentAttempt >= attempts
      ) {
        await prisma.review.update({
          where: {
            id: reviewId,
          },
          data: {
            status: "failed",
          },
        });

        console.log(
          "🔴 Review permanently failed!"
        );
      }

      // IMPORTANT:
      // Rethrow the error so BullMQ
      // performs its retry.
      throw error;
    }
  },

  {
    connection,
  }
);

// ----------------------------------------
// BullMQ failure listener
// ----------------------------------------

worker.on("failed", (job, err) => {
  console.log(
    `❌ Job ${job?.id} failed!`
  );

  console.log(
    "Attempt:",
    job?.attemptsMade
  );

  console.log(
    "Error:",
    err.message
  );
});
