import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { VpcStack } from '../lib/vpc-stack';
import { BClusterStack } from '../lib/b_cluster-stack';

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
  
new BClusterStack(app, 'dpstripEKS-Stack6', { env, vpc });
