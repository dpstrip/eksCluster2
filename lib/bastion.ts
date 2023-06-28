import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3Assets from 'aws-cdk-lib/aws-s3-assets';

export class Bastion extends Construct {
  readonly host : ec2.BastionHostLinux;

  constructor(scope: Construct, id: string, vpc: ec2.IVpc) {
    super(scope, id);

    const asset = new s3Assets.Asset(this, 'S3Asset', {
      path: 'assets/kubectl'
    });
    
    const userData = ec2.UserData.forLinux();
    userData.addS3DownloadCommand({
      bucket: asset.bucket,
      bucketKey: asset.s3ObjectKey,
      localFile: '/tmp/kubectl'
    });
    userData.addCommands(
      'chmod +x /tmp/kubectl',
      'cp /tmp/kubectl /usr/local/bin'
    );

    this.host = new ec2.BastionHostLinux(this, 'Bastion', { 
      vpc,
      requireImdsv2: true,
      machineImage: ec2.MachineImage.latestAmazonLinux({ 
        userData,
        generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2
      })
    });
    
    this.host.role.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess'));
  }
}