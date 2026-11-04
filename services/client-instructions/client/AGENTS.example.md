# Client reel instructions

Before starting a new reel, call the `get_reel_instructions` tool on the `fused_reel` MCP server. If MCP is unavailable, fetch the current instructions using the installed `fetch-instructions.mjs` loader. Read the result for this run. If access is denied or both paths fail, stop the instructed reel workflow and report the failure. Do not use a saved copy from an earlier run.

Keep completed videos, drafts, approvals, and your own brand information in this repository. Keep the Fused access token in your local secret store, outside Git. This file is a bootstrap pointer, not the paid instruction bundle.
