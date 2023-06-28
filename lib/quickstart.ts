import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { 
    Construct, 
    IConstruct 
} from 'constructs';
import * as eks from 'aws-cdk-lib/aws-eks';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import { Asset } from 'aws-cdk-lib/aws-s3-assets';

export class Quickstart extends Construct {
    private repoUri: string;

    constructor(scope: Construct, id: string, private cluster: eks.ICluster) {
      super(scope, id);

      this.repoUri = ecr.Repository
          .fromRepositoryName(this, 'Repo', 'weblogic')
          .repositoryUri;

      const deps = {
        operator: this.operator(),
        traefik : this.traefik(),
        domain  : this.domain(),
        ingress : this.ingress()
      };
      deps.domain.node.addDependency(deps.operator);
      deps.ingress.node.addDependency(deps.domain, deps.traefik);
    }

    private chart(name: string): Asset {
      return new Asset(this, `${name}-asset`, {
          path: `assets/${name}`
      });
    }
    
    private namespace(ns: string) : Record<string, any> {
      return {
          apiVersion: 'v1',
          kind: 'Namespace',
          metadata: { name: ns }
      }
    }

    operator(): IConstruct {
      const id = 'weblogic-operator'
      const ns = `sample-${id}-ns`;
      const sa = `sample-${id}-sa`;
  
      this.cluster.addManifest(`${id}-manifest`, 
        this.namespace(ns), 
        {
          apiVersion: 'v1',
          kind: 'ServiceAccount',
          metadata: { 
            name: sa,
            namespace: ns
          }      
        });
  
      const tag = this.node.tryGetContext('operator');
      return this.cluster.addHelmChart(`${id}-chart`, {
        wait: true,
        namespace: ns,
        chartAsset: this.chart(id),
        values: {
          'serviceAccount': sa,
          'image': `${this.repoUri}:${tag}`
        }
      });
    }
        
    traefik(): IConstruct {
      const id = 'traefik';
      const tag = this.node.tryGetContext(id);
      return this.cluster.addHelmChart(`${id}-chart`, {
        wait: true,
        namespace: id,
        chartAsset: this.chart(id),
        values: {
          image: {
              repository: this.repoUri,
              tag: tag
          },
          service: {
              annotations: {
              'service.beta.kubernetes.io/aws-load-balancer-type': 'nlb',
              'service.beta.kubernetes.io/aws-load-balancer-internal': 'true'
              }
          },
          ports: {
              web: {
                  nodePort: 30305
              },
                  websecure: {
                  nodePort: 30443
              }
          },
          kubernetes: {
              namespaces: ['traefik', 'sample-domain1-ns']
          }
        }
      });
    }
    
    domain(): IConstruct {
      const f = fs.readFileSync('manifests/domain.yaml', 'utf-8');
      const manifest = yaml.loadAll(f) as Record<string, any>[];
      
      this.setImages(manifest);
      this.setSecrets(manifest);

      return new eks.KubernetesManifest(this, 'domain-manifest', {
        cluster: this.cluster,
        manifest
      });
    }

    ingress(): IConstruct {
      const f = fs.readFileSync('manifests/ingress.yaml', 'utf-8');
      const manifest = yaml.loadAll(f) as Record<string, any>[];
      return new eks.KubernetesManifest(this, 'ingress-manifest', {
        cluster: this.cluster,
        manifest
      });
    }

    setImages(manifest: Record<string, any>[]){
      const svrTag = this.node.tryGetContext('server');
      const auxTag = this.node.tryGetContext('auxiliary');
      const domain = manifest.find(x => x.kind=='Domain');
      domain!.spec.imagePullSecrets = [];
      domain!.spec.image = `${this.repoUri}:${svrTag}`;
      domain!.spec.configuration.model.auxiliaryImages = [{
        image: `${this.repoUri}:${auxTag}`
      }];
    }
    
    setSecrets(manifest: Record<string, any>[]) {
      const username   = process.env.USERNAME;
      const password   = process.env.PASSWORD;
      const encryption = process.env.ENCRYPTION;

      const credsSecret = manifest.find(x => x.metadata.name == 
        'sample-domain1-weblogic-credentials');
      credsSecret!.stringData.username = username;
      credsSecret!.stringData.password = password;
          
      const encryptSecret = manifest.find(x => x.metadata.name == 
        'sample-domain1-runtime-encryption-secret');
      encryptSecret!.stringData.password = encryption;
    }
}