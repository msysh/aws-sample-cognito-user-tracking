# What the authorized Cognito user will be recorded in the CloudTrail

**This is a sample project for test. It not be used for production.**

When a user who is authorized by Cognito accesses the AWS resources, what will be recorded in the CloudTrail ? Can the Cognito user be identified? This project is for checking it.

## Overview

An authenticated Cognito user upload (`PutObject`) a file to S3 via web application then checking what identifies the Cognito user in the CloudTrail.

The following are included in this repository:

* [`cdk`](./cdk/) : Deploying Cognito UserPool, Identity Pool, and S3 bucket
* [`client`](./client/) : React app using Node.js

## TL;DR

I have confirmed that the following event in CloudTrail records the User ID of the Cognito User Pool:

```json
{
  "userIdentity": {
    "sessionContext": {
      "webIdFederationData": {
        "attributes": {
          "cognito-identity.amazonaws.com:amr": "[\"authenticated\",\"cognito-idp.<region>.amazonaws.com/<user_pool_id>\",\"cognito-idp.us-east-1.amazonaws.com/<user_pool_id>:CognitoSignIn:<**COGNITO_USER_ID**>\"]",
        }
      }
    }
  }
}
```

## Pre-requirements

You will need to set up CloudTrail to check the trail recorded by this project and configure that CloudTrail records data events in the S3 bucket created by the CDK.

For more information, please refer to the following documents :  
https://docs.aws.amazon.com/awscloudtrail/latest/userguide/logging-data-events-with-cloudtrail.html

## How to setup

### AWS resources (deploy using CDK)

#### 1. Change directory

```bash
cd ./cdk
```

#### 2. Configure context parameter

Configure `cdk.json` or `~/.cdk.json` like following:

```json
{
  // :
  // (snip)
  // :
  "context": {
    // :
    // (snip)
    // :
    "cognito-user-tracking": {
      "projectName": "cognito-user-tracking",
      "cognitoDomainName": "please-set-unique-domain-name",
      "clientAppUrl": "http://localhost:3000"
    }
  }
}
```

#### 3. Install dependencies and Build

```bash
npm install
npm run build
```

#### 4. Deploy

```bash
cdk deploy
```

#### 5. Check Output values

Please review the following outputs :

* S3 Bucket Name
* Cognito User Pool ID
* Cognito User Pool Client ID
* Cognito Domain Name
* Cognito Identity Pool ID

These values will be used in the React app in the following steps.

#### 6. Create a Cognito User

Create a Cognito user with following command.

```bash
USER_POOL_ID=<user_pool_id>
USER_NAME=<user_name>
USER_EMAIL=<user_email>

aws cognito-idp admin-create-user \
  --user-pool-id ${USER_POOL_ID} \
  --username ${USER_NAME} \
  --user-attributes Name=email,Value="${USER_EMAIL}" Name=email_verified,Value=true \
  --message-action SUPPRESS

aws cognito-idp admin-set-user-password \
--user-pool-id ${USER_POOL_ID} \
--username ${USER_NAME} \
--password '<Password123>' \
--permanent
```

Confirm the created user status.

```bash
aws cognito-idp admin-get-user \
  --user-pool-id ${USER_POOL_ID} \
  --username ${USER_NAME}
```

#### 7. Configuring CloudTrail and enable Data Event

Refer to the following documentation to configure CloudTrail and enable Data Event recording.

* Creating a trail for your AWS account
  * https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-create-and-update-a-trail.html
* Logging data events for trails
  * https://docs.aws.amazon.com/awscloudtrail/latest/userguide/logging-data-events-with-cloudtrail.html

---

### React App

#### 1. Change directory

```bash
cd ./client
```

#### 2. Configure AWS resource IDs

Configuring AWS resource IDs in [`./src/App.js`](./client/src/App.js).

```javascript
const SITE_URL = 'http://localhost:3000';
const REGION = '<Region>';

const S3_BUCKET_NAME = '<S3 Bucket Name>';
const IDENTITY_POOL_ID = '<Cognito User Identity Pool ID>';
const COGNITO_DOMAIN_NAME = '<Cognito Domain Name>';
const COGNITO_USER_POOL_ID = '<Cognito User Pool ID>';
const COGNITO_CLIENT_ID = '<Cognito User Pool Client ID>';
```

#### 3. Install dependencies

```bash
npm install
```

#### 4. Start React app

```bash
npm start
```

#### 5. Access the React app

1. Access `http://localhost:3000` from your browser.
2. Should be redirected to the Cognito Hosted UI sign-in.
3. Once you have signed in, you can upload. Path prefix and select the file you wish to upload.

## Check CloudTrail

Check the CloudTrail events. The following methods are available to check

* Amazon Athena (_requires output to S3_)
* CloudWatch Logs Insight (_requires recording to CloudWatch Logs_)

## License

MIT