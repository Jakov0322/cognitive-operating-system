//TODO: Implement more robust identity resolution logic that can handle cases like GitHub's noreply email addresses, which can lead to multiple entities being created for the same person. This could involve normalizing email addresses, using additional metadata, or implementing heuristics to identify likely matches.

function isGitHubNoreplyEmail(email: string): boolean {
  return email.endsWith("@users.noreply.github.com");
}