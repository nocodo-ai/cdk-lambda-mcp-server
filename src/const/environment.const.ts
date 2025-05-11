/**
 * Environment Variable Constants
 *
 * This file defines constants for environment variable names used throughout the application.
 * Using constants instead of hardcoded strings helps maintain consistency and prevents typos.
 */

/**
 * The name of the environment variable that will contain the API key.
 * This is used in both the CDK stack when setting the environment variable
 * and in the authorizer Lambda when retrieving the API key value.
 */
export const API_KEY = "API_KEY";

/**
 * The name of the environment variable that contains the endpoint URL
 * for the external code review service.
 * This is passed from the CDK deployment to the Lambda function.
 */
export const STACK_ENDPOINT = "STACK_ENDPOINT";
