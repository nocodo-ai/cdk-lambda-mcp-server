/**
 * API Key Authorizer Lambda Function
 *
 * This Lambda function acts as a custom request authorizer for API Gateway.
 * It validates requests by checking if they include the correct API key
 * in the 'x-api-key' header and returns an IAM policy document.
 */

// Import AWS Lambda authorizer types
import {
  APIGatewayAuthorizerResult,
  StatementEffect,
  APIGatewayTokenAuthorizerEvent,
} from "aws-lambda";

// Import our environment variable constant
import { API_KEY } from "../const/environment.const";

/**
 * Lambda handler function for API key authorization
 *
 * This function:
 * 1. Receives an API Gateway request event
 * 2. Extracts the API key from the request headers
 * 3. Compares it to the expected API key from environment variables
 * 4. Returns an IAM policy that allows or denies access
 *
 * @param event - The API Gateway request event containing headers
 * @param context - The Lambda context object
 * @param callback - Callback function to return the authorization result
 */
export const handler = (
  event: APIGatewayTokenAuthorizerEvent,
  context: any,
  callback: (error: any, policy?: APIGatewayAuthorizerResult) => void
): void => {
  console.log("API Key Authorizer invoked:", JSON.stringify(event, null, 2));

  // Get the API key from environment variables (set in the CDK stack)
  const expectedApiKey: string = process.env[API_KEY]!;

  // Extract request parameters
  const apiKey = event.authorizationToken;

  // Check if the API key is present and matches the expected value
  if (apiKey === expectedApiKey) {
    console.log("Authorization successful");
    callback(null, generateAllow("user", event.methodArn));
  } else {
    console.log("Authorization failed");
    callback("Unauthorized");
  }
};

/**
 * Helper function to generate an IAM policy
 *
 * @param principalId - The principal ID (user identifier)
 * @param effect - The effect of the policy (Allow/Deny)
 * @param resource - The resource ARN to apply the policy to
 * @returns The authorization response with policy document
 */
const generatePolicy = (
  principalId: string,
  effect: StatementEffect,
  resource: string
): APIGatewayAuthorizerResult => {
  if (!effect || !resource) {
    throw new Error("Effect and resource are required");
  }

  let authResponse: APIGatewayAuthorizerResult = {
    principalId: principalId,
    policyDocument: {
      Version: "2012-10-17",
      Statement: [
        {
          Action: "execute-api:Invoke",
          Effect: effect,
          Resource: resource,
        },
      ],
    },
  };

  // Optional context values that can be accessed in the integration
  authResponse.context = {
    apiKeyValid: true,
    timestamp: new Date().toISOString(),
  };

  return authResponse;
};

/**
 * Generate an Allow policy
 */
const generateAllow = (
  principalId: string,
  resource: string
): APIGatewayAuthorizerResult => {
  return generatePolicy(principalId, "Allow", resource);
};

/**
 * Generate a Deny policy
 */
const generateDeny = (
  principalId: string,
  resource: string
): APIGatewayAuthorizerResult => {
  return generatePolicy(principalId, "Deny", resource);
};
