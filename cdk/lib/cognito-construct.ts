import {
  aws_cognito as cognito,
  aws_iam as iam,
  CfnOutput,
  Duration,
  RemovalPolicy,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';

export interface CognitoConstructProps {
  projectName: string,
  domainName: string,
  hostedUiRedirectUrl: string
}

export class CognitoConstruct extends Construct {
  constructor(scope: Construct, id: string, props: CognitoConstructProps) {
    super(scope, id);

    // -----------------------------
    // Cognito UserPool
    // -----------------------------
    const userPool = new cognito.UserPool(this, 'cognito-user-pool', {
      userPoolName: `${props.projectName}-user-pool`,
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      autoVerify: {
        email: true,
        phone: false
      },
      enableSmsRole: false,
      passwordPolicy: {
        minLength: 8,
        requireDigits: true,
        requireLowercase: true,
        requireSymbols: true,
        requireUppercase: true,
        tempPasswordValidity: Duration.days(7)
      },
      removalPolicy: RemovalPolicy.DESTROY,
      selfSignUpEnabled: false,
      signInAliases: {
        username: true,
        email: true
      },
      signInCaseSensitive: false,
      standardAttributes: {
        email: { mutable: false, required: true }
      }
    });

    // -----------------------------
    // Cognito App Client
    // -----------------------------
    const appClient = new cognito.UserPoolClient(this, 'cognito-app-client', {
      userPool: userPool,
      userPoolClientName: `${props.projectName}`,
      authFlows: {
        adminUserPassword: false,
        custom: false,
        userPassword: false,
        userSrp: false
      },
      generateSecret: false,
      preventUserExistenceErrors: true,
      supportedIdentityProviders: [
        cognito.UserPoolClientIdentityProvider.COGNITO
      ],
      oAuth: {
        callbackUrls: [
          props.hostedUiRedirectUrl
        ],
        flows: {
          authorizationCodeGrant: true,
          implicitCodeGrant: false,
          clientCredentials: false
        },
        logoutUrls: [
          props.hostedUiRedirectUrl
        ],
        scopes: [
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.PROFILE
        ],
      }
    });

    const domain = userPool.addDomain('cognito-domain', {
      cognitoDomain: {
        domainPrefix: props.domainName
      }
    });

    // -----------------------------
    // Cognito ID Pool
    // -----------------------------
    const idPool = new cognito.CfnIdentityPool(this, 'cognito-id-pool', {
      identityPoolName: `${props.projectName}-id-pool`,
      allowClassicFlow: true,
      allowUnauthenticatedIdentities: false,
      cognitoIdentityProviders: [
        {
          clientId: appClient.userPoolClientId,
          providerName: userPool.userPoolProviderName,
        }
      ]
    });

    // Authenticated Role
    const idpAuthRolePolicyDocument = new iam.PolicyDocument({
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'cognito-identity:*',
            's3:PutObject'
          ],
          resources: [
            '*'
          ]
        })
      ]
    });
    const idpAuthRole = new iam.Role(this, 'idp-authenticated-role', {
      roleName: `${props.projectName}-idp-auth-role`,
      assumedBy: new iam.FederatedPrincipal('cognito-identity.amazonaws.com', {
        "StringEquals": {
          "cognito-identity.amazonaws.com:aud": idPool.ref
        },
        "ForAnyValue:StringLike": {
          "cognito-identity.amazonaws.com:amr": "authenticated"
        }
      },
      'sts:AssumeRoleWithWebIdentity'),
      description: 'Cognito identity pool authenticated role',
      inlinePolicies: {
        'policy': idpAuthRolePolicyDocument
      }
    });

    // Unauthenticated Role
    const idpUnauthRolePolicyDocument = new iam.PolicyDocument({
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'cognito-sync:*',
          ],
          resources: [
            '*'
          ]
        })
      ]
    });
    const idpUnauthRole = new iam.Role(this, 'idp-unauthenticated-role', {
      roleName: `${props.projectName}-idp-unauth-role`,
      assumedBy: new iam.FederatedPrincipal('cognito-identity.amazonaws.com', {
        "StringEquals": {
          "cognito-identity.amazonaws.com:aud": idPool.ref
        },
        "ForAnyValue:StringLike": {
          "cognito-identity.amazonaws.com:amr": "unauthenticated"
        }
      },
        'sts:AssumeRoleWithWebIdentity'),
      description: 'Cognito identity pool unahthenticated role',
      // inlinePolicies: {
      //   'policy': idpUnauthRolePolicyDocument
      // }
    });

    new cognito.CfnIdentityPoolRoleAttachment(this, 'cognito-id-pool-role-attachment', {
      identityPoolId: idPool.ref,
      roles: {
        authenticated: idpAuthRole.roleArn,
        unauthenticated: idpUnauthRole.roleArn,
      }
    });

    // -----------------------------
    // Output
    // -----------------------------
    new CfnOutput(this, 'output-User-Pool-Id', {
      description: 'User Pool ID',
      value: userPool.userPoolId
    });
    new CfnOutput(this, 'output-identity-pool-id', {
      description: 'Identity Pool ID',
      value: idPool.ref
    });
    new CfnOutput(this, 'output-user-pool-client-id', {
      description: 'User Pool Client ID',
      value: appClient.userPoolClientId
    });
    new CfnOutput(this, 'output-domain-name', {
      description: 'Cognito Domain Name',
      value: domain.domainName
    });
  }
}