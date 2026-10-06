export type ChangedLine = {
  line: number;
  code: string;
};

export type ChangedFile = {
  file: string;
  changedLines: ChangedLine[];
};

export type AIReviewIssue = {
  file: string;
  line: number;
  severity: string;
  description: string;
  suggestion: string;
};

export type AIReview = {
  issues: AIReviewIssue[];
};

export type ValidationResult = {
  validIssues: AIReviewIssue[];
  rejectedIssues: {
    issue: AIReviewIssue;
    reason: string;
  }[];
};

export function validateReview(
  review: AIReview,
  changedFiles: ChangedFile[],
): ValidationResult {
  const validIssues: AIReviewIssue[] = [];
  const rejectedIssues: ValidationResult["rejectedIssues"] = [];

  for (const issue of review.issues) {
    const file = changedFiles.find((file) => file.file === issue.file);

    if (!file) {
      rejectedIssues.push({
        issue,
        reason: `File "${issue.file}" was not changed.`,
      });
      continue;
    }
    console.log("🔍 VALIDATOR DEBUG");
    console.log("AI file:", issue.file);
    console.log("AI line:", issue.line);
    console.log(
      "Available changed lines:",
      file.changedLines.map((line) => line.line),
    );

    const changedLine = file.changedLines.find(
      (changedLine) => changedLine.line === issue.line,
    );
   

    if (!changedLine) {
      rejectedIssues.push({
        issue,
        reason: `Line ${issue.line} in "${issue.file}" was not changed.`,
      });
      continue;
    }

    if (!["low", "medium", "high"].includes(issue.severity)) {
      rejectedIssues.push({
        issue,
        reason: `Invalid severity "${issue.severity}".`,
      });
      continue;
    }

    if (typeof issue.description !== "string" || !issue.description.trim()) {
      rejectedIssues.push({
        issue,
        reason: "Description is missing.",
      });
      continue;
    }

    if (typeof issue.suggestion !== "string" || !issue.suggestion.trim()) {
      rejectedIssues.push({
        issue,
        reason: "Suggestion is missing.",
      });
      continue;
    }

    validIssues.push(issue);
  }

  return {
    validIssues,
    rejectedIssues,
  };
}
