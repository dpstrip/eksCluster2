import * as cdk from 'aws-cdk-lib';
import { Bastion } from './bastion';
import { Construct } from 'constructs';
import { Quickstart } from './quickstart';
import { PrivateCluster } from './cluster';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as eks from 'aws-cdk-lib/aws-eks';
import * as iam from 'aws-cdk-lib/aws-iam';

export interface EKSlogicProps extends cdk.StackProps{
  vpc: ec2.IVpc
}

export class EksClusterStack extends cdk.Stack {

  private cluster: eks.Cluster;
  private host: ec2.BastionHostLinux;
  
  constructor(scope: Construct, id: string, props: EKSlogicProps) {
    super(scope, id, props);
    this.init(props.vpc);
    this.configureAccess();
    //new Quickstart(this, 'Quickstart', this.cluster);
  }


  
  private init(vpc: ec2.IVpc) {
    this.host = new Bastion(this, 'Bastion', vpc).host;
    this.cluster = new PrivateCluster(this, 'Cluster', vpc).cluster;
  }

  private configureAccess() {
    // add bastion/console to masters
    [
      this.host.role,
      iam.Role.fromRoleName(this, 'Admin', 
        this.node.tryGetContext('consoleRole'))
    ].forEach(r => this.cluster.awsAuth.addMastersRole(r));

    // allow bastion to access the cluster
    this.cluster.connections.allowFrom(this.host, ec2.Port.allTcp());
  }
