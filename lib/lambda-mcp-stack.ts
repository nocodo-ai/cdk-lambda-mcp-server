/**
 * AWS CDK Stack Definition for Lambda MCP Server
 *
 * This file defines the AWS infrastructure for our MCP server using the AWS CDK.
 * It creates:
 * - An API Gateway HTTP API endpoint
 * - A Lambda function for API key authorization
 * - A Lambda function for handling MCP protocol requests
 * - Log retention configuration for both Lambda functions
 */

// Import CDK core constructs
import { Stack, StackProps, CfnOutput, Duration } from "aws-cdk-lib";
import { Construct } from "constructs";

// Import Lambda-specific constructs
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";

// Import API Gateway constructs
import {
  RestApi,
  LambdaIntegration,
  AuthorizationType,
  RequestAuthorizer,
  TokenAuthorizer,
  EndpointType,
} from "aws-cdk-lib/aws-apigateway";

// Node.js path utilities for file references
import * as path from "path";

// Import constant for environment variable names
import { API_KEY, STACK_ENDPOINT } from "../src/const/environment.const";

// Import CloudWatch Logs constructs for log retention
import { RetentionDays } from "aws-cdk-lib/aws-logs";
// Import API Gateway V2 behaviors (used in integration configuration)
import { PassthroughBehavior } from "aws-cdk-lib/aws-apigatewayv2";

export interface LambdaMcpStackProps extends StackProps {
  stackEndpoint: string;
}

/**
 * Main CDK Stack for the Lambda MCP Server
 *
 * This stack defines all AWS resources needed to run an MCP server on AWS Lambda.
 */
export class LambdaMcpStack extends Stack {
  constructor(scope: Construct, id: string, props: LambdaMcpStackProps) {
    super(scope, id, props);

    /**
     * Step 1: Create the API Key Authorizer Lambda
     *
     * This Lambda function validates API keys sent in request headers.
     * It will check if the x-api-key header matches our configured value.
     */
    const authorizerLambda = new NodejsFunction(this, "ApiKeyAuthorizer", {
      runtime: Runtime.NODEJS_22_X, // Using Node.js 22.x runtime
      handler: "handler", // Function exported as 'handler'
      entry: path.join(__dirname, "../src/authorizer/api-key-authorizer.ts"), // Path to source code
      environment: {
        // Setting the API key as an environment variable
        // In a production environment, you would use AWS Secrets Manager instead
        [API_KEY]: "my-mcp-secret",
      },
      logRetention: RetentionDays.ONE_WEEK, // Keep logs for one week
    });

    /**
     * Step 2: Create the API Gateway Token Authorizer
     *
     * This connects our authorizer Lambda to API Gateway.
     * It implements a token authorizer that checks the x-api-key header.
     */
    const authorizer = new TokenAuthorizer(this, "ApiKeyTokenAuthorizer", {
      handler: authorizerLambda,
      identitySource: "method.request.header.x-api-key", // Extract the API key from this header
      resultsCacheTtl: Duration.seconds(10), // Cache authorization results for 10 seconds to reduce Lambda invocations
    });

    /**
     * Step 3: Create the main MCP Lambda handler
     *
     * This Lambda function processes MCP protocol requests and provides tool functionality.
     * It uses the @modelcontextprotocol/sdk library to implement the MCP server.
     */
    const mcpLambda = new NodejsFunction(this, "McpHandler", {
      runtime: Runtime.NODEJS_22_X, // Using Node.js 22.x runtime
      handler: "handler", // Function exported as 'handler'
      entry: path.join(__dirname, "../src/handler/mcp-handler.ts"), // Path to source code
      logRetention: RetentionDays.ONE_WEEK, // Keep logs for one week
      environment: {
        // Setting the stack endpoint as an environment variable
        // This is the URL of the external service we will call
        [STACK_ENDPOINT]: props.stackEndpoint,
      },
      timeout: Duration.minutes(3), // Set a timeout for the Lambda function (3 minutes)
    });

    /**
     * Step 4: Create the REST API Gateway
     *
     * This creates the API Gateway REST API that will expose our Lambda function.
     * REST APIs support longer timeouts than HTTP APIs, allowing us to set a 3-minute timeout.
     */
    const restApi = new RestApi(this, "McpRestApi", {
      restApiName: "mcp-api", // Name of the API in AWS
      description: "API for MCP integration", // Description for the API
      endpointTypes: [EndpointType.REGIONAL], // Use regional endpoints to avoid 30s timeout with edge endpoints
    });

    /**
     * Step 5: Add the MCP route with authorizer
     *
     * This configures the API to:
     * - Accept POST requests at the /mcp endpoint
     * - Integrate with our MCP Lambda function
     * - Require authorization via the API key authorizer
     */
    const mcpResource = restApi.root.addResource("mcp");
    mcpResource.addMethod(
      "POST", // MCP protocol uses POST requests
      new LambdaIntegration(mcpLambda, {
        timeout: Duration.minutes(3), // Set integration timeout to 3 minutes
        proxy: true, // Proxy integration to pass through request and response
        passthroughBehavior: PassthroughBehavior.WHEN_NO_TEMPLATES, // Pass through requests without templates
      }), // Connect to our Lambda
      {
        authorizer, // Use our API key authorizer
        authorizationType: AuthorizationType.CUSTOM, // Specify that we're using a custom authorizer
        operationName: "processMcpRequest",
      }
    );

    /**
     * Step 6: Output the API URL
     *
     * This creates a CloudFormation output that shows the API URL after deployment.
     * You'll need this URL to configure VS Code to use your MCP server.
     */
    new CfnOutput(this, "ApiUrl", {
      value: restApi.url + "mcp", // Include the resource path in the URL
      description: "URL of the REST API",
    });
  }
}
