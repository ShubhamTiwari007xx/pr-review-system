import { fetchPullRequestDiff } from "./github/github";
import { parseDiff } from "./diff-parser";

async function main() {
  const diffUrl =
    "https://github.com/ShubhamTiwari007xx/webhook/pull/64.diff";

  console.log("📥 Fetching real GitHub diff...");

  const diff = `
diff --git a/auth.js b/auth.js
--- a/auth.js
+++ b/auth.js
@@ -10,2 +10,3 @@
 const user = getUser();
+const password = user.password;
+console.log(password);

@@ -30,2 +31,3 @@
 const token = getToken();
+validateToken(token);
+return token;
`;
  console.log("✅ Diff fetched!");
  console.log("📏 Diff length:", diff.length);

  const result = parseDiff(diff);

  console.log("\n📂 Parsed changed files:");
  console.log(JSON.stringify(result, null, 2));
}

main();