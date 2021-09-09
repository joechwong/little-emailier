## Table of Contents

- [Table of Contents](#table-of-contents)
- [Architecture Design - CURRENT State](#architecture-design---current-state)
  - [High level architecture design of little-emailier](#high-level-architecture-design-of-little-emailier)
  - [Architecture Choices](#architecture-choices)
    - [Implementation Explained](#implementation-explained)
  - [Benefits of Serverless Architecture](#benefits-of-serverless-architecture)
  - [Constraints and Limitations of Serverless Architecture](#constraints-and-limitations-of-serverless-architecture)
- [AWS Well-Architected Framework - Reliability Pillar](#aws-well-architected-framework---reliability-pillar)
- [Architecture Design - FUTURE State for Production Readiness](#architecture-design---future-state-for-production-readiness)

## Architecture Design - CURRENT State

### High level architecture design of little-emailier

[![high level architecture diagram](little-emailier-current-state.png 'Architecture Diagram - Current State')](https://github.com/joechwong/little-email-poc/blob/little-emailier/architecture/little-emailier-current-state.png)

### Architecture Choices

I have selected a [AWS Serverless Microservices Architecture](https://docs.aws.amazon.com/whitepapers/latest/microservices-on-aws/serverless-microservices.html) approach for application development, deployment and operation.

The serverless approach, in combination with other AWS native services, offers a very `cost effective` [(two orders of magnitude for some use cases)](https://trackchanges.postlight.com/serving-39-million-requests-for-370-month-or-how-we-reduced-our-hosting-costs) approach to web application and backend services.

The core serverless components of little-emailier are:

1. **`API Gateway`** - a fully managed AWS service that makes it easy for developers to create, publish, maintain, monitor, and secure APIs at any scale, processing up to hundreds of thousands of concurrent API calls, including traffic management, authorization and access control, monitoring, and API version management. Using API Gateway, you can create RESTful APIs and WebSocket APIs that enable real-time two-way communication applications. You can also use AWS X-Ray to trace messages as they travel through the APIs to backend services.
2. **`Lambda`** - an AWS serverless compute service that runs your code, without provisioning or managing servers, in response to events and automatically manages the underlying compute resources for you and scale your code with high availability. You pay only for the compute time you consume.
3. **`CloudWatch Logs`** - this service allows you to collect and store logs from your resources, applications, and services in near real-time. CloudWatch also helps you by monitoring certain metrics for all of your API Gateway and Lambda functions automatically. These metrics include:
   - API Gateway
     - 4XX Errors
     - 500 Errors
     - Integration Latency
     - Overall Latency
     - Cache Hit Count
     - Cache Miss Count
   - Lambda function
     - Invocations
     - Error related to the number of times your function fails with an error, timeouts, memory issues, unhandled exceptions
     - Throttles
     - Duration

#### Implementation Explained

1. API Gateway receives email request from the user
2. `email` Lambda function is invoked by API Gateway via [Lambda Proxy Integration](https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html)
3. The `email` function handler acts as the express router to route the request to the `process email service`
4. Based on the `PRIMARY_SERVICE_PROVIDER` configuration in `server/config/email/serviceProvider.json` - refer to [this section in the README.md](https://github.com/joechwong/little-emailier/blob/little-emailier/README.md#how-to-run-local-from-vs-code-or-your-preferred-ide), the `process email service` will delegate the request to either `send sendgrid email service` or `send mailgun email service` to deliver the email.
   - A message contains the successful response will be returned to the user if the email is accepted and queued by the Primary service provider.
5. Should there be any failure in delivering the email from the Primary service provider, the `failover service` will come into play and deliver the email via the Secondary (failover) service provider. **The idea is that regardless of which email service provider is set as the Primary provider, the `failover service` will be triggered to handle the redelivery of the original email request without affecting the customers.**
   - A list of messages containing the failure response of the Primary service provider and successful response if the failed over email is accepted and queued by the Secondary service provider will be returned to the user.
   - If the primary provider failed, and the secondary provider also failed, it's not necessary to failover from secondary provider back to the primary provider. Hence, the failover, if any, is only processed once per request. So that it won't go into endless loop. This is the benefit of this service to handle such reciprocal failover gracefully.
   - The failover service keeps track of the failure errors from both primary and secondary providers, which will be returned to the user.
6. Logs from API Gateway and Lambda function are stored in CloudWatch Logs

### Benefits of Serverless Architecture

```
1. No servers to manage, zero admin
2. Robust and continuous scaling, tracking workload
3. Sub-second metering, per trigger and 100ms of compute, no idle charges
4. Flexibility and agility, hybrid architectures
5. Baked in security and governance
6. Continuous integration, delivery and deployment
```

### Constraints and Limitations of Serverless Architecture

1. Serverless architecture is not suitable (costs) for high volume, high throughput applications with long compute times. However, it is suitable for the most of the `long tail` applications.
2. One of the most common performance issues is referred to as a `cold start`. It occurs when a platform must initiate internal resources. It may take some time for your serverless architecture to handle that first function request.
3. One of the most well publicized limitations of Serverless is the constrained execution environment of FaaS platforms. FaaS functions execute with limited CPU, memory, disk, and I/O resources, and unlike legacy server processes, cannot run indefinitely. For example:
   - The maximum execution timeout for a function is 15 minutes
   - The maximum memory is limited to 3008 MB
   - Request and response (synchronous calls) body payload size can be up to to 6 MB.
   - Event request (asynchronous calls) body can be up to 128 KB.

## AWS Well-Architected Framework - Reliability Pillar

The reliability pillar focuses on ensuring a workload performs its intended function correctly and consistently when it’s expected to. A resilient workload quickly recovers from failures to meet business and customer demand.

The AWS Well-Architected Framework defines resilience as having `the capability to recover when stressed by load (more requests for service), attacks (either accidental through a bug, or deliberate through intention), and failure of any component in the workload’s components.`

Couple of references:

- [AWS Resiliency Concept](https://wa.aws.amazon.com/wellarchitected/2020-07-02T19-33-23/wat.concept.resiliency.en.html)
- [Resilience in AWS Lambda](https://docs.aws.amazon.com/lambda/latest/dg/security-resilience.html)

This serves the architecture and pattern to minimize and prevent data loss.

## Architecture Design - FUTURE State for Production Readiness

To be discussed in future collaboration

[![architecture diagram](little-emailier-future-state.png 'Architecture Diagram - Future State')](https://github.com/joechwong/little-email-poc/blob/little-emailier/architecture/little-emailier-future-state.png)
