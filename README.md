# Lambda MCP (Model Context Protocol) Server

This project demonstrates how to deploy a Model Context Protocol (MCP) server as an AWS Lambda function with API Gateway integration. MCP is a protocol that enables AI assistants to interact with tools and services, allowing them to perform actions on behalf of users.

## Project Overview

The Lambda MCP server provides:

- A serverless MCP server implementation using AWS Lambda and API Gateway
- API key authentication for secure access
- Easy deployment using AWS CDK (Cloud Development Kit)
- A code review tool that analyzes code snippets using an external API

## Bootstrapping

Before deploying for the first time in a new AWS account/region, you need to bootstrap the CDK:

```bash
cdk bootstrap aws://[aws-account-id]/[aws-account-region]
```

## Deploy

### Prerequisites

- Docker must be running (needed by CDK for bundling the TypeScript Lambda functions)
- AWS credentials configured in your environment
- Environment variables set in `.env` file (copy from `.env.template`)

### Deployment Steps

```bash
# Install dependencies if you haven't already
npm install

# Deploy the stack to AWS
cdk deploy LambdaMcpStack
```

Approve changes when prompted. [Do you wish to deploy these changes (y/n)? y]

After successful deployment, the CDK will output:

- API URL for your MCP endpoint
- API key details (this will be "my-mcp-secret" as defined in the stack)

## Destroy

To remove all AWS resources created by this stack:

```bash
cdk destroy LambdaMcpStack
```

## Understanding the Model Context Protocol (MCP)

MCP is a protocol that enables AI models to communicate with external tools. In this project:

1. The MCP server is implemented in `src/handler/mcp-handler.ts`
2. It defines a "code-review" tool that analyzes code snippets
3. When an AI assistant (like GitHub Copilot in VS Code) needs to review code, it can:
   - Send a request to your MCP server
   - The server forwards the code to an external code review API
   - The analysis results are returned to the AI assistant

This architecture allows AI assistants to extend their capabilities without needing to have all functionality built-in.

## Configure VSCode

After deploying, you can configure Visual Studio Code to use your MCP server. This allows VS Code AI assistants (like GitHub Copilot) to utilize the tools you've defined.

Add your MCP Server in VS Code's settings.json:

1. Open Command Palette (Ctrl+Shift+P or Cmd+Shift+P)
2. Search for "Preferences: Open Settings (JSON)"
3. Add the following configuration, replacing placeholders with your actual values:

```json
"mcp": {
    "servers": {
      "my-mcp-server": {
        "url": "https://xxxxxxxxxx.execute-api.{region}.amazonaws.com/mcp",
        "headers": {
          "x-api-key": "my-mcp-secret"  // This is the API key defined in the stack
        }
      }
    }
  }
```

Note: The URL should be taken from the CDK output after deployment.

## Customizing Your MCP Server

### How the Code Review Tool Works

The code review tool:

1. Accepts code snippets as input
2. Sends them to an external API at `https://stack.nocodo.ai`
3. Returns the analysis results to the AI assistant

### Adding New Tools

To add more tools to your MCP server, edit the `src/handler/mcp-handler.ts` file:

```typescript
// Example of adding a multiply tool
server.tool("multiply", { a: z.number(), b: z.number() }, async ({ a, b }) => ({
  content: [{ type: "text", text: String(a * b) }],
}));
```

### Changing the API Key

The API key is defined in `lib/lambda-mcp-stack.ts`. For better security in production:

1. Change the hardcoded value `"my-mcp-secret"` to a more secure key
2. Consider using AWS Secrets Manager instead of environment variables

### Advanced Configuration

For more complex tools or integrations:

- Add additional Lambda functions as needed
- Create more routes in the API Gateway
- Consider using AWS services like DynamoDB for persistence
