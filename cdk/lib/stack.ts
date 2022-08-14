import { Stack, StackProps, Tags } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CognitoConstruct } from './cognito-construct';
import { S3Construct} from './s3-construct';

export interface ContextParameter {
  readonly projectName: string,
  readonly cognitoDomainName: string,
  readonly clientAppUrl: string,
}

export class CognitoUserTrackingStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const contextParam: ContextParameter = this.node.tryGetContext('cognito-user-tracking') as ContextParameter;

    if (!contextParam) {
      throw new Error('You need to configure context parameters. "cognito-user-tracking".("projectName", "cognitoDomainName", "clientAppUrl")');
    }

    const projectName = contextParam.projectName;
    const cognitoDomainName = contextParam.cognitoDomainName;
    const clientAppUrl = contextParam.clientAppUrl;

    const s3Bucket = new S3Construct(this, 'bucket', {
      projectName: projectName,
      clientAppUrlForCORS: clientAppUrl
    })

    const cognito = new CognitoConstruct(this, 'cognito', {
      projectName: projectName,
      domainName: cognitoDomainName,
      hostedUiRedirectUrl: `${clientAppUrl}/auth`
    });

    Tags.of(this).add('project', projectName);
  }
}
