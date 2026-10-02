import "dotenv/config";

async function main() {
  const response = await fetch(
    "https://api.github.com/repos/ShubhamTiwari007xx/webhook/issues/48/comments",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        body: " Hello from NEXUS!",
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();

    throw new Error(
      `GitHub API failed: ${response.status} ${response.statusText}\n${error}`
    );
  }

  const data = await response.json();

  console.log("✅ Comment posted!");
  console.log("Comment ID:", data.id);
  console.log("Comment URL:", data.html_url);
}

main().catch((error) => {
  console.error("❌", error.message);
});