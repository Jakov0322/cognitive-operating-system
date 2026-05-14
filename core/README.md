# Core

The core layer transforms raw project signals into structured project intelligence.

It should not know about GitHub, GitLab, Jira, Slack, or any external platform directly.

Connectors produce normalized events.
Core consumes normalized events and generates:

- entities
- relations
- timelines
- knowledge items
- inferred project memory

Pipeline:

Raw signals
→ normalized events
→ entity extraction
→ relation extraction
→ knowledge graph
→ temporal memory
→ inference
→ outputs