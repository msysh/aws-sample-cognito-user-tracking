#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CognitoUserTrackingStack } from '../lib/stack';

const app = new cdk.App();
new CognitoUserTrackingStack(app, 'CognitoUserTracking', {});