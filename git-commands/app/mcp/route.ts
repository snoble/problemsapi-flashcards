// /mcp: the git decks as tools for a learner's own chat agent (lib/agent.ts),
// over MCP's Streamable HTTP. Each request is answered on its own, with no
// session, so any instance can answer any request.
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';

import { agentServer } from '@/lib/agent';

async function answer(request: Request) {
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  await agentServer().connect(transport);
  return transport.handleRequest(request);
}

export { answer as DELETE, answer as GET, answer as POST };
