/**
 * MCP Server Lambda Handler
 *
 * This file defines the main Lambda function that handles MCP protocol requests.
 * It creates an MCP server with tools and configures middleware for HTTP integration.
 */

// Import the Middy middleware framework for Lambda functions
import middy from "@middy/core";
// Import error handler middleware to process HTTP errors
import httpErrorHandler from "@middy/http-error-handler";
// Import the Model Context Protocol server class
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
// Import Zod for schema validation
import { z } from "zod";

// Import the MCP middleware for Middy that bridges HTTP requests to MCP server
import mcpMiddleware from "../mcp/index";
// Import environment variable constants
import { STACK_ENDPOINT } from "../const/environment.const";

/**
 * Step 1: Create an MCP server instance
 *
 * This defines our server with basic metadata about its name and version.
 * The MCP server will process protocol-compliant requests and route them to the appropriate tools.
 */
const server = new McpServer({
  name: "My Lambda hosted MCP Server",
  version: "1.0.0",
});

/**
 * Step 2: Register tools with the MCP server
 *
 * We define a specialized "code-review" tool that:
 * - Helps AI models perform code reviews on small snippets
 * - Analyzes code for bugs, code smells, and improvement opportunities
 * - Is optimized for 5-50 line snippets
 *
 * This tool sends the code to an external API service for analysis:
 * - Accepts a code string as input
 * - Sends the code to a hosted code review service
 * - Returns the analysis results from the external service
 */
server.tool(
  // Tool name - identifies this capability to the AI model
  "code-review",
  // Tool description - helps the AI understand when and how to use this tool
  "The Code Review Assistant is an MCP tool that enables an LLM to perform static code reviews on small, self-contained code snippets. It works best with individual functions, classes, or short scripts. Users input a code snippet in plain text, and the tool analyzes it for bugs, code smells, and improvement opportunities. It provides suggestions on readability, performance, maintainability, and adherence to best practices. Ideal use cases include peer review automation, onboarding support, and code refactoring. It's most effective on focused code sections between 5–50 lines. The tool does not execute code and is not suited for large or interdependent codebases.",
  // Parameter schema using Zod for validation
  // Accepts a string parameter named 'code' containing the code to be reviewed
  { code: z.string() },
  // Tool implementation
  // Uses external API to perform code review
  async ({ code }) => {
    try {
      // Call the external code review service
      const endpoint = process.env[STACK_ENDPOINT];
      if (!endpoint) {
        throw new Error("STACK_ENDPOINT environment variable is not defined");
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code }),
      });

      // Check if the request was successful
      if (!response.ok) {
        throw new Error(
          `Code review service responded with status: ${response.status}`
        );
      }

      // Parse and return the response
      const result = (await response.json()) as { data: string };
      return {
        content: [{ type: "text", text: JSON.stringify(result.data) }],
      };
    } catch (error) {
      console.error("Error performing code review:", error);

      // Handle the error properly with type checking
      // This ensures we extract a meaningful message regardless of error type
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";

      // Return a user-friendly error message in the MCP protocol format
      // This allows the AI assistant to understand and communicate the error
      return {
        content: [
          {
            type: "text",
            text: `Error performing code review: ${errorMessage}`,
          },
        ],
      };
    }
  }
);

/**
 * Step 3: Create and export the Lambda handler
 *
 * We use the Middy middleware framework to:
 * 1. Convert HTTP requests to MCP protocol format using mcpMiddleware
 * 2. Handle errors using httpErrorHandler
 *
 * This allows our function to receive HTTP requests from API Gateway
 * and process them as MCP protocol interactions.
 */
export const handler = middy()
  .use(mcpMiddleware({ server: server as any }))
  .use(httpErrorHandler());
