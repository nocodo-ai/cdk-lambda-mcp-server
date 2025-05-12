#!/usr/bin/env node
/**
 * Main entry point for the CDK application.
 *
 * This file is the starting point of the AWS CDK deployment process.
 * It loads environment variables from a .env file and initializes the CDK app
 * with our Lambda MCP stack.
 */

// Load environment variables from .env file
import "dotenv/config";

// Import our stack definition and the CDK App class
import { LambdaMcpStack } from "../lib/lambda-mcp-stack";
import { App } from "aws-cdk-lib";

// Create a new CDK application
const app = new App();

// Instantiate our stack with the application
new LambdaMcpStack(app, "LambdaMcpStack", {
  /*
   * Environment configuration for the stack.
   * The account and region are loaded from environment variables.
   * These should be defined in the .env file:
   * - CDK_ACCOUNT: Your AWS account ID
   * - CDK_REGION: The AWS region to deploy to (e.g., us-east-1)
   */
  env: {
    account: process.env.CDK_ACCOUNT,
    region: process.env.CDK_REGION,
  },
  stackEndpoint: process.env.STACK_ENDPOINT!,
  apiKey: process.env.API_KEY!,
});
