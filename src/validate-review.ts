type ChangedFile = {
  file: string;
  changedLines: number[];
};

type AIReview = {
  issues: {
    file: string;
    line: number;
    severity: string;
    description: string;
    suggestion: string;
  }[];
};

export function validateReview(
  review: AIReview,
  changedFiles: ChangedFile[]
) {
  for (const issue of review.issues) {
    const file = changedFiles.find(
      (file) => file.file  === issue.file
    );

    if (!file) {
      throw new Error(
        `Invalid AI review: file "${issue.file}" was not changed.`
      );
    }

   if(!file.changedLines.includes(issue.line)) {
      throw new Error(
        `Invalid AI review: line ${issue.line} in file "${issue.file}" was not changed.`
      );
    }

    if (
      !["low", "medium", "high"].includes(issue.severity)
    ) {
      throw new Error(
        `Invalid AI review: invalid severity "${issue.severity}".`
      );
    }

    if (typeof issue.description !== "string") {
      throw new Error(
        "Invalid AI review: description is missing."
      );
    }

    if (typeof issue.suggestion !== "string") {
      throw new Error(
        "Invalid AI review: suggestion is missing."
      );
    }
  }

  return true;
}