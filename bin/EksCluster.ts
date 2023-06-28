#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { VpcStack } from '../lib/vpc-stack';
import { EksClusterStack } from '../lib/eksCluster-stack';

const env = { 
  region: process.env.CDK_DEFAULT_REGION,
  account: process.env.CDK_DEFAULT_ACCOUNT
};

const app = new cdk.App();
const vpc = new VpcStack(
  app, 
  'dpstrip6-vpc', 
  { env })
  .vpc;
  
new EksClusterStack(app, 'dpstripEKS-Stack1', { env, vpc });
