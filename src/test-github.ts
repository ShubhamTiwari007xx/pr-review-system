import dotenv from "dotenv";
dotenv.config();
import { downloadRepositoryArchive, getPullRequest } from "./github/github";
if(!process.env.GITHUB_TOKEN) {
  throw new Error("GITHUB_TOKEN is not set in the environment variables.");
}
if(process.env.GITHUB_TOKEN){
    console.log("GETTING IT .");
}
async function main() {
  console.log("TEST 1: getPullRequest");

  const repo = "ShubhamTiwari007xx/webhook";
  const prNumber = 71;

  const pullRequest = await getPullRequest(repo, prNumber);
  console.log("PR Number:", pullRequest.number);
  console.log("PR Title:", pullRequest.title);
  console.log("Head SHA:", pullRequest.head.sha);

  console.log("\nTEST 2: downloadRepositoryArchive");

  const archive = await downloadRepositoryArchive(
    repo,
    pullRequest.head.sha
  );

  console.log("Archive downloaded!");
  console.log("Archive size:", archive.length, "bytes");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
