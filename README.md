## Table of Contents

- [Table of Contents](#table-of-contents)
- [Problem statement](#problem-statement)
- [Solution - little-emailier](#solution---little-emailier)
- [Architecture](#architecture)
- [Deployed little-emailier for you to play with](#deployed-little-emailier-for-you-to-play-with)
  - [Prerequisite](#prerequisite)
  - [Primary and Secondary (Failover) email service providers](#primary-and-secondary-failover-email-service-providers)
  - [JaSON Chrome extension](#jason-chrome-extension)
  - [How to play with it](#how-to-play-with-it)
- [Local environment setup in VS Code (or your preferred IDE)](#local-environment-setup-in-vs-code-or-your-preferred-ide)
  - [NPM and AWS CLI setup for Windows](#npm-and-aws-cli-setup-for-windows)
  - [Node version](#node-version)
  - [Serverless framework](#serverless-framework)
- [How to run local from VS Code (or your preferred IDE)](#how-to-run-local-from-vs-code-or-your-preferred-ide)
- [How to Build](#how-to-build)
- [How to Deploy to your AWS Cloud account](#how-to-deploy-to-your-aws-cloud-account)
  - [Create IAM Policy and IAM User for CI deployment](#create-iam-policy-and-iam-user-for-ci-deployment)
  - [Configure AWS Credentials for your local environment](#configure-aws-credentials-for-your-local-environment)
  - [Create S3 Deployment bucket](#create-s3-deployment-bucket)
  - [Deploy little-emailier to AWS Cloud](#deploy-little-emailier-to-aws-cloud)
- [Deploy lamba function only](#deploy-lamba-function-only)
  - [How to test it](#how-to-test-it)
- [Debug and Monitoring](#debug-and-monitoring)
  - [API Gateway Logs](#api-gateway-logs)
  - [Lambda Function Logs](#lambda-function-logs)
- [How to remove the deployed resources from AWS](#how-to-remove-the-deployed-resources-from-aws)
- [To Do](#to-do)
- [Development progress log](#development-progress-log)

## Problem statement

Create a backend service that accepts the necessary information and sends emails.

The application should provide an abstraction between two different email service providers. If one of the services goes down, your service can quickly failover to a different provider without affecting your customers.

The solution should cater for multiple email recipients, CCs and BCCs but there is no need to support HTML email body types (plain text is OK).

## Solution - little-emailier

To address the problem statement, a backend email service called little-emailier written in Node.js is developed to process and send emails via two selected service providers API with failover capability.

## Architecture

Details of architecture designed is documented in [ARCHITECTURE.md](https://github.com/joechwong/little-email-poc/blob/little-emailier/server/architecture/ARCHITECTURE.md).

Here is the high level architecture diagram of little-emailier
[![high level architecture diagram](server/architecture/little-emailier-current-state.png 'Architecture Diagram - Current State')](https://github.com/joechwong/little-email-poc/blob/little-emailier/server/architecture/little-emailier-current-state.png)

## Deployed little-emailier for you to play with

### Prerequisite

1. Mailgun
   - Sandbox domains are restricted to up to 5 authorized recipients only. Please provide 4 recipient email address for invitation to be sent and recipients need to accept the invitation.
2. Sendgrid
   - Verification of Single Sender is required. The deployed little-emailier has my email verified. So you have to use `joechwong@gmail.com` as the 'from' sender. Otherwise, you can provide your email address so that I can add it as the verified sender.

### Primary and Secondary (Failover) email service providers

The deployed little-emailier is configured to use `Sendgrid` as the Primary email service provider and `Mailgun` as the failover.

However, it's easy to switch the primary and secondary providers by a quick config change, if required. You will have chance to play with this when you [run it at your local environment](#local-environment-setup) or [deploying at your AWS cloud](#how-to-deploy-to-aws) below.

### JaSON Chrome extension

[JaSON](https://shanebell.github.io/JaSON/) is a Google Chrome extension for testing APIs and making HTTP network requests. It is a simple, easy to use HTTP client to send API requests from within Chrome and see formatted, syntax highlighted responses.

It's available in the [Chrome Web Store](https://chrome.google.com/webstore/detail/oealdlhfjifhgbmjnenhkgffglaibojf). Or you can use Postman if that's your preference.

### How to play with it

Play with it using JaSON or Postman with the following details.

- `URL of the RESTful API endpoint`: **https://ekmzel1mbd.execute-api.ap-southeast-2.amazonaws.com/dev/api/emails**
- `Method`: **POST**
- `Content Type`: **application/json**
- `Request Body`: JSON object with the following format

      | Key     | Description               | Type             | Required by Sendgrid | Required by Mailgun  |
      | ------- |---------------------------|------------------|----------------------|----------------------|
      | from    | Sender email address      | String           | Yes                  | Yes                  |
      | to      | 'to' recipient email(s)   | Array of strings | Yes                  | Yes                  |
      | cc      | 'cc' recipient email(s)   | Array of strings | No                   | No                   |
      | bcc     | 'bcc' recipient email(s)  | Array of strings | No                   | No                   |
      | subject | Subject of the email      | String           | Yes                  | No                   |
      | text    | Content body of the email | String           | Yes                  | Yes                  |

  - `Sampe JSON object as the request body`

    ```json
    {
      "from": "joechwong@gmail.com",
      "to": ["a@hello.com", "b@hello.com"],
      "cc": ["c@hello.com", "d@hello.com", "e@hello.com"],
      "bcc": ["f@hello.com"],
      "subject": "Welcome to Little Emailier",
      "text": "Please give me a like and I shout you a bite."
    }
    ```

- `Failover test cases`
  - When testing with `Sendgrid` as the **Primary** and `Mailgun` as the **Failover**. _This is the deployed setting_
    - **Do not include the `subject` in the JSON object** as `subject` is mandatory in Sendgrid.
  - When testing with `Mailgun` as the **Primary** and `Sendgrid` as the **Failover**.
    - **Do not include the `from` in the JSON object**. Although `from` is mandatory in both providers, I had set a default email address if `from` is missing during the email delivery from Sendgrid
- `Response`

  - Success or failure response will be returned in JSON format as an array of messages
  - Sample successful response
    ```json
    ["Email is accepted and queued for delivery by Sendgrid"]
    ```
  - Sample response of failing over to Mailgun successfully _`using missing subject as the test case`_
    ```json
    [
      "Sendgrid 400 - The subject is required. You can get around this requirement if you use a template with a subject defined or if every
         personalization has a subject defined.",
      "Email is accepted and queued for delivery by Mailgun"
    ]
    ```
  - Sample response of failing over to Sendgrid successfully

    ```json
    [
      "Mailgun 400 - 'from' parameter is not a valid address. please check documentation",
      "Email is accepted and queued for delivery by Sendgrid"
    ]
    ```

  - Sample response failed at both Sendgrid and Mailgun

    ```json
    [
      "Sendgrid 400 - The subject is required. You can get around this requirement if you use a template with a subject defined or if every
         personalization has a subject defined.",
      "Mailgun 400 - 'from' parameter is not a valid address. please check documentation"
    ]
    ```

## Local environment setup in VS Code (or your preferred IDE)

Clone this repository from [GitHub](https://github.com/joechwong/little-emailier) and following the instructions below.

### NPM and AWS CLI setup for Windows

You can skip this step if you already have NPM and AWS CLI installed.

1. Add windows path in Environment Variables (System variable)
   ```
   C:\Users\<user>\AppData\Roaming\npm
   ```
2. Install AWS CLI from [AWS CLI MSI](https://s3.amazonaws.com/aws-cli/AWSCLI64.msi)

### Node version

You must have node v14.x installed

### Serverless framework

Run the following command to install the latest version of serverless framework (v2.57.0)

```
npm i -g serverless
```

## How to run local from VS Code (or your preferred IDE)

1. Register your own accounts on Sendgrid and Mailgun.
   1. Sendgrid - what you need
      1. Create and capture the `API Key` for later use
      2. Create a new sender via `Single Sender Verification` so that you are able to send email using Sendgrid API from this email address.
   2. Mailgun - what you need
      1. Create API Key and capture the `Private API Key` for later use
      2. Capture your `Sandbox Domain` for later use. You can find it under Sending -> Domains.
      3. Add up to 5 `Authorized Recipients` to receive email from Mailgun API. You can find it under Sending -> Overview.
2. Open the cloned `little-emailier` folder in VS Code
3. Open the [Email Service Providers json config file at `server/config/email/serviceProvider.json`](https://github.com/joechwong/little-email-poc/blob/little-emailier/server/config/email/serviceProvider.json)
   1. **`PRIMARY_SERVICE_PROVIDER`** - set the `Primary email service provider` of your choice between `sendgrid` and `mailgun`
   2. **`SENDGRID_API_KEY`** - enter your **Sendgrid** `API Key` from above
   3. **`MAILGUN_DOMAIN_NAME`** - enter your **Mailgun** `Sandbox Domain` from above
   4. **`MAILGUN_API_KEY`** - enter your **Mailgun** `Private API Key` from above
4. Open a new terminal and run the following commands to install the dependencies

   ```bash
   cd server
   npm install
   ```

5. Starting local
   This project uses [Serverless Offline](https://github.com/dherault/serverless-offline) to run local environment.

   This Serverless plugin emulates AWS λ and API Gateway on your local machine to speed up your development cycles. To do so, it starts an HTTP server that handles the request's lifecycle like API Gateway does and invokes your Lambda handlers.

   Assuming you are already on the `server` folder, run the following command

   ```
   npm start
   ```

   or

   ```yaml
   serverless offline start
   ```

6. You should see the `serverless offline` being started locally

   ```yml
   > npm run lint && serverless offline start
   > eslint src -c .eslintrc.json

   Serverless: Bundling with Webpack...
   Serverless: Watching for changes...
   offline: Starting Offline: local/ap-southeast-2.
   offline: Offline [http for lambda] listening on http://localhost:3002
   offline: Function names exposed for local invocation by aws-sdk:
              * email: little-emailier-local-email

      ┌─────────────────────────────────────────────────────────────────────────┐
      │                                                                         │
      │   POST | http://localhost:8080/api/emails                               │
      │   POST | http://localhost:8080/2015-03-31/functions/email/invocations   │
      │                                                                         │
      └─────────────────────────────────────────────────────────────────────────┘

   offline: [HTTP] server ready: http://localhost:8080 �
   ```

7. How to test it

   Follow the same steps from [**How to play with it**](#how-to-play-with-it) above but replace the `URL of the RESTful API endpoint` to the `localhost HTTP endpoint` **http://localhost:8080/api/emails** started by serverless offline.

8. Have fun and enjoy!

## How to Build

Note: With serverless framework, you don't need to build, package, or publish source code before running it local or deploying it to AWS.

```bash
cd server
npm run build
```

## How to Deploy to your AWS Cloud account

### Create IAM Policy and IAM User for CI deployment

1. Create `IAM Policy` on AWS using the JSON file located at [server/config/aws/little-emailier-ci-policy.json](https://github.com/joechwong/little-email-poc/blob/little-emailier/server/config/aws/little-emailier-ci-policy.json)
   1. In the _AWS IAM Console_, create a new policy.
   2. Under _Create policy_ page, choose the `JSON` tab and copy the json object.
   3. Follow the wizard and create the policy.
2. Create `IAM User` on AWS using the new policy.
   1. Choose _Access type_ - `Programmatic access`.
   2. Under _Set Permissions_, select `Attach existing policies directly`.
   3. Search and select the checkbox of the policy you just created.
   4. Follow the wizard and create the user.
   5. Capture the **`Access key ID`** and **`Secret access key`** for next step.

### Configure AWS Credentials for your local environment

The Serverless Framework needs access to your cloud provider account so that it can deploy, create and manage resources on your behalf. There are several ways to setup the AWS Credentials using the **`Access key ID`** and **`Secret access key`** generated above.

The instruction provided here is using `AWS Profiles`. However, if you prefer other methods, please visit [Serverless Framework - Setup AWS Credentials](https://www.serverless.com/framework/docs/providers/aws/guide/credentials/)

In your VS Code Terminal, run the following command with the **`Access key ID`** and **`Secret access key`** of the CI Deployment IAM User created above.

```
serverless config credentials --provider aws --key <Access key ID> --secret <Secret access key> -o --profile default
```

To verify it, run the following command

```
aws configure list
```

### Create S3 Deployment bucket

By default, Serverless creates a S3 bucket on AWS with a generated name like `<service name>-serverlessdeploymentbuck-1x6jug5lzfnl7` to store your service's stack state. This can lead to many old deployment buckets laying around in your AWS account and your service having more than one bucket created (only one bucket is actually used).

Hence, it's best practice to create a single serverless deployment bucket per account.

Create the following S3 bucket on your AWS account. Replace `<aws:accountId>` with your AWS account Id.
Note: you can enable `Block public access` and the rest just use the defaults.

```
com.serverless.<aws:accountId>.deploys
```

### Deploy little-emailier to AWS Cloud

This project uses [Serverless Framework](https://www.serverless.com/#How-It-works), a free and open-source web framework written using Node.js, to builds, compiles, and packages code for serverless deployment, and then deploys the package to the cloud.

Along with [webpack](https://webpack.js.org/), an open-source JavaScript module bundler, and [serverless-webpack](https://github.com/serverless-heaven/serverless-webpack), a Serverless plugin to build your lambda functions with Webpack, lambda functions are packaged and compiled individually, resulting in smaller Lambda packages that contain only the code and dependencies needed to run the function. It also integrates with `serverless-offline` to simulate local API Gateway endpoints.

The application resources required for little-emailier is defined in the [serverless.yml](https://github.com/joechwong/little-email-poc/blob/little-emailier/server/serverless.yml) file.

**_`FINALLY, to deploy`_**

Replace `dev` below with the stage you want to deploy, e.g. ut, dev, sit, uat, prod or even with your name. Under to the **`server`** folder and rrun the following commands

```yaml
serverless deploy --stage dev
```

You will see the deployment progress similar to below.

```yaml
Serverless: Bundling with Webpack...
asset src/handlers/email.js 14.8 KiB [emitted] (name: src/handlers/email) 1 related asset
orphan modules 11.1 KiB [orphan] 9 modules
runtime modules 937 bytes 4 modules
./src/handlers/email.js + 9 modules 11.9 KiB [not cacheable] [built] [code generated]
webpack compiled successfully in 1563 ms
Serverless: Package lock found - Using locked versions
Serverless: Packing external modules: body-parser@^1.19.0, cors@^2.8.5, express@^4.17.1, serverless-http@^2.7.0, node-fetch@^2.6.1
Serverless: Copying existing artifacts...
Serverless: Packaging service...
Serverless: Installing dependencies for custom CloudFormation resources...
Serverless: Uploading CloudFormation file to S3...
Serverless: Uploading artifacts...
Serverless: Uploading service email.zip file to S3 (827.64 kB)...
Serverless: Uploading custom CloudFormation resources...
Serverless: Validating template...
Serverless: Creating Stack...
Serverless: Checking Stack create progress...
...................................................
Serverless: Stack create finished...
Service Information
service: little-emailier
stage: dev
region: ap-southeast-2
stack: little-emailier-dev
resources: 15
api keys:
None
endpoints:
POST - https://ekmzel1mbd.execute-api.ap-southeast-2.amazonaws.com/dev/api/emails
functions:
email: little-emailier-dev-email
layers:
None
```

## Deploy lamba function only

Once the stack is deployed on AWS, and if you make changes to the lambda function. You don't have to deploy the entire stack again.

You can just deploy the function by running the following command:

```
serverless deploy -f <lambda function> -s <stage>
```

For example to deploy the `email` lambda function to `dev` stage, run

```
serverless deploy -f email -s dev
```

### How to test it

Follow the same steps from [**How to play with it**](#how-to-play-with-it) above but replace the `URL of the RESTful API endpoint` to the `endpoints` displays in the deployment output above. For example, https://ekmzel1mbd.execute-api.ap-southeast-2.amazonaws.com/dev/api/emails is the endpoints from my Serverless deployment.

Have fun and enjoy, again!

## Debug and Monitoring

### API Gateway Logs

On AWS CloudWatch console, navigate to _Logs_ -> _Log groups_ and locate **/aws/api-gateway/little-emailier-ut**
You can also find the **API-Gateway-Execution-Logs** in the same location

### Lambda Function Logs

On AWS CloudWatch console, navigate to _Logs_ -> _Log groups_ and locate **/aws/lambda/little-emailier-ut-email**

## How to remove the deployed resources from AWS

Once you finished playing with this project, you are happy to remove all the resources deployed on your AWS cloud. Simply run the following command to remove the stack.

Replace `dev` below with the stage you have deployed.

```bash
cd server
serverless remove --stage dev
```

## To Do

1. TDD using testing frameworks like Jest, Mocha, Chai.
2. Refactor user Message array responses into Array of Message Objects, so that Provider, Status Code and Message for each of the messages can be segregated for better information handling.
3. Add support for rich HTML content and media file attachments
4. Add Name to all recipients, e.g. "Joe Wong <joechwong@gmail.com>"
5. Fine tune IAM Policy for CI deployment with more fine-grained least privileges principle
6. Secure API Gateway with API Key and control the usage via Usage Plan
7. Create API Gateway Authorizer to authorize the API calls using a custom Lambda function or Cognito User Pool
8. Add Elastic Application Load Balancer for scaling horizontally to distribute the incoming traffic
9. Add database to store emails submission and status for record purpose
10. Develop a little-emailier React frontend to accept users inputs
11. Host the React frontend on S3
12. Content delivery via CloudFront with SSL Certificate to serve the React frontend from S3 as the origin
13. Add WAF to protect common web exploits like SQL injection, cross-site scripting, http flood attack
14. Productiontise adhering to the Architecture Diagram of the Future State
    [![architecture diagram](server/architecture/little-emailier-future-state.png 'Architecture Diagram - Future State')](https://github.com/joechwong/little-email-poc/blob/little-emailier/server/architecture/little-emailier-future-state.png)

## Development progress log

1. Create [Github Repository](https://github.com/joechwong/little-emailier.git)
2. Setup accounts and API Keys on Mailgun and SendGrid
3. Review email api official integration docs
   - [Mailgun API Reference](https://documentation.mailgun.com/en/latest/api_reference.html)
   - [SendGrid API Reference](https://docs.sendgrid.com/api-reference/mail-send/mail-send)
4. Scaffold node project, [serverless framework](https://www.serverless.com/) and email service provider configs
5. Design Current State system architecture
6. Create IAM Policy and User for CI deployment to AWS cloud from serverless framework
7. Develop email handler and express router
8. Develop process email service
9. Develop email services for Mailgun and Sendgrid
10. Develop failover service
11. Additional setup required on email service providers
    - [Mailgun Authorized Recipients](https://help.mailgun.com/hc/en-us/articles/217531258-Authorized-Recipients)
    - [Sendgrid SenderIdentity](https://docs.sendgrid.com/for-developers/sending-email/sender-identity)
      - [Single Sender Verification](https://docs.sendgrid.com/ui/sending-email/sender-verification)
12. Review Response Status Codes
    - [Mailgun HTTP response codes](https://documentation.mailgun.com/en/latest/api-intro.html#status-codes)
    - [Sendgrid HTTP response codes](https://docs.sendgrid.com/api-reference/mail-send/mail-send)
13. Unit testing on local environment
14. Test CI deployment of little-emailier to AWS cloud
15. Unit testing little-emailier on AWS cloud
16. Design Future State architecture
17. Documentations
18. Add ToDo items
