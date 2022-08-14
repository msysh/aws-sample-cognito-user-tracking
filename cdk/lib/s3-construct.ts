import {
  aws_s3 as s3,
  RemovalPolicy,
  CfnOutput
} from 'aws-cdk-lib';
import { Construct } from 'constructs';

export interface S3ConstructProps {
  projectName: string,
  clientAppUrlForCORS: string
};

export class S3Construct extends Construct {
  constructor(scope: Construct, id: string, props: S3ConstructProps){
    super(scope, id);

    const uploadBucket = new s3.Bucket(this, `s3-bucket`, {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      cors: [
        {
          allowedHeaders: ['*'],
          allowedMethods: [
            s3.HttpMethods.HEAD,
            s3.HttpMethods.GET,
            s3.HttpMethods.POST,
            s3.HttpMethods.PUT,
            s3.HttpMethods.DELETE
          ],
          allowedOrigins: [
            props.clientAppUrlForCORS
          ],
          exposedHeaders: ['ETag']
        }
      ],
      removalPolicy: RemovalPolicy.DESTROY
    });

    // -----------------------------
    // Output
    // -----------------------------
    new CfnOutput(this, 'output-s3-bucket', {
      description: 'S3 Bucket Name',
      value: uploadBucket.bucketName
    });
  }
}
