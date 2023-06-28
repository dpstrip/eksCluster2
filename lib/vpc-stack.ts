import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export class VpcStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
      super(scope, id, props);

      this.vpc = new ec2.Vpc(this, 'Vpc', {
          maxAzs: 2,
          ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/24'),
          subnetConfiguration: [
            {
              name: 'isolated',
              subnetType: ec2.SubnetType.PRIVATE_ISOLATED
            }
          ],
          gatewayEndpoints: {
            s3: { service: ec2.GatewayVpcEndpointAwsService.S3 }
          }
        });
      
      this.vpc.isolatedSubnets.forEach(s => cdk.Tags.of(s).add(
        'kubernetes.io/role/internal-elb',
        '1'));
      
      const sg = new ec2.SecurityGroup(this, 'VpceSg', { vpc: this.vpc });
      sg.addIngressRule(ec2.Peer.ipv4(this.vpc.vpcCidrBlock), ec2.Port.tcp(443));
  
      [
        ec2.InterfaceVpcEndpointAwsService.AUTOSCALING,
        ec2.InterfaceVpcEndpointAwsService.CLOUDFORMATION,
        ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,      
        ec2.InterfaceVpcEndpointAwsService.EC2,
        ec2.InterfaceVpcEndpointAwsService.ECR,
        ec2.InterfaceVpcEndpointAwsService.ECR_DOCKER,
        ec2.InterfaceVpcEndpointAwsService.ELASTIC_LOAD_BALANCING,
        ec2.InterfaceVpcEndpointAwsService.KMS,
        ec2.InterfaceVpcEndpointAwsService.LAMBDA,
        ec2.InterfaceVpcEndpointAwsService.STEP_FUNCTIONS,
        ec2.InterfaceVpcEndpointAwsService.STS,
        // for session manager
        ec2.InterfaceVpcEndpointAwsService.EC2_MESSAGES,        
        ec2.InterfaceVpcEndpointAwsService.SSM,
        ec2.InterfaceVpcEndpointAwsService.SSM_MESSAGES
      ].forEach(e => this.vpc.addInterfaceEndpoint(e.shortName, {
          service: e,
          securityGroups: [sg]
      }));
      
      // eks endpoint not yet added to InterfaceVpcEndpointAwsService
      new ec2.InterfaceVpcEndpoint(this, 'EksVpce', {
          vpc: this.vpc,
          securityGroups: [sg],
          privateDnsEnabled: true,
          service: new ec2.InterfaceVpcEndpointService(
              `com.amazonaws.${this.region}.eks`, 
              443)
      });
  }
}
