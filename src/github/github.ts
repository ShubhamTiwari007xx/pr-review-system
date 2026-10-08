
export async function fetchPullRequestDiff(diffUrl: string) {
  const response = await fetch(diffUrl);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch GitHub diff: ${response.status} ${response.statusText}`
    );
  }

  const diff = await response.text();

  if (!diff.trim()) {
    throw new Error("GitHub PR diff is empty");
  }

  return diff;
}

export async function getPullRequest(
  repo: string,
  prNumber: number
) {
  const response = await fetch(
    `https://api.github.com/repos/${repo}/pulls/${prNumber}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();

    throw new Error(
      `Failed to fetch GitHub pull request: ${response.status} ${response.statusText}\n${error}`
    );
  }

  const data = await response.json();

  return data;
}

export async function downloadRepositoryArchive(
  repo: string,
  sha: string
) {
  const response = await fetch(
    `https://api.github.com/repos/${repo}/zipball/${sha}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();

    throw new Error(
      `Failed to download repository archive: ${response.status} ${response.statusText}\n${error}`
    );
  }

  const buffer = await response.arrayBuffer();

  return Buffer.from(buffer);
}

export async function postPullRequestComment(
  repo: string,
  prNumber: number,
  body: string
) {
  const response = await fetch(
    `https://api.github.com/repos/${repo}/issues/${prNumber}/comments`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        body,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();

    throw new Error(
      `Failed to post GitHub comment: ${response.status} ${response.statusText}\n${error}`
    );
  }

  const data = await response.json();

  return data;
}


