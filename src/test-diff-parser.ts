import { parseDiff } from "./diff-parser";

const diff = `
diff --git a/auth.js b/auth.js
index 1234567..abcdefg 100644
--- a/auth.js
+++ b/auth.js
@@ -8,3 +8,5 @@
 function login(req, res) {
+  const password = req.body.password;
+  const user = createUser(password);
   return res.json(user);
 }
`;

const result = parseDiff(diff);

console.log(JSON.stringify(result, null, 2));