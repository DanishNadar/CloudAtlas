/* The three largest public clouds. Service names were checked against Google Cloud's "Compare AWS and Azure services
   to Google Cloud" page (Oct 2026). Product names change; always confirm in each provider's documentation. */
const PROVIDERS = {
  aws: {
    name: 'Amazon Web Services', short: 'AWS', color: '#FF9900', cls: 'aws',
    launched: '2006', first: 'Amazon S3 (March 2006) and Amazon EC2 (August 2006)',
    origin: 'Grew out of Amazon\'s experience running large-scale infrastructure for its retail business, and opened that capability to everyone as rentable building blocks.',
    known: ['The first large public cloud, with the broadest catalog of services', 'A very large community, training ecosystem and partner network', 'Fine-grained building blocks you compose yourself'],
    console: 'AWS Management Console', cli: 'aws', iac: 'AWS CloudFormation, AWS CDK', org: 'AWS Organizations → organizational units → accounts',
    zones: 'Regions, each with multiple Availability Zones', chips: 'Graviton (Arm CPUs), Trainium and Inferentia (AI accelerators)',
    ai: 'Amazon Bedrock (foundation models), Amazon SageMaker AI (build, train, deploy)', cert: 'AWS Certified Cloud Practitioner',
    flagship: [['server', 'EC2'], ['bucket', 'S3'], ['fn', 'Lambda'], ['db', 'DynamoDB'], ['ai', 'Bedrock'], ['cdn', 'CloudFront']]
  },
  azure: {
    name: 'Microsoft Azure', short: 'Azure', color: '#0A84E8', cls: 'azure',
    launched: '2010', first: 'Announced as Windows Azure in 2008, generally available in 2010, renamed Microsoft Azure in 2014',
    origin: 'Built by Microsoft for organizations that already run Windows Server, SQL Server, Active Directory and Microsoft 365, and extended to Linux and open source.',
    known: ['Deep integration with Microsoft identity and enterprise software', 'Hybrid and on-premises management (Azure Arc)', 'Enterprise agreements and a large partner channel'],
    console: 'Azure portal', cli: 'az (Azure CLI) and Azure PowerShell', iac: 'ARM templates, Bicep', org: 'Microsoft Entra tenant → management groups → subscriptions → resource groups',
    zones: 'Regions, many with availability zones; region pairs for disaster recovery', chips: 'Cobalt (Arm CPUs), Maia (AI accelerators)',
    ai: 'Microsoft Foundry (formerly Azure AI Foundry, including OpenAI models), Azure Machine Learning', cert: 'Microsoft Certified: Azure Fundamentals (AZ-900)',
    flagship: [['server', 'Virtual Machines'], ['bucket', 'Blob Storage'], ['fn', 'Functions'], ['db', 'Cosmos DB'], ['ai', 'Foundry'], ['key', 'Entra ID']]
  },
  gcp: {
    name: 'Google Cloud', short: 'Google Cloud', color: '#4285F4', cls: 'gcp',
    launched: '2008', first: 'Google App Engine (2008), then Compute Engine (generally available 2013)',
    origin: 'Exposes infrastructure Google built for its own services: a private global network, large-scale data systems, and the cluster management experience that led to Kubernetes.',
    known: ['Data analytics (BigQuery) and a global network', 'Kubernetes heritage (GKE) and containers', 'AI research and accelerators (TPUs, Gemini models)'],
    console: 'Google Cloud console', cli: 'gcloud', iac: 'Infrastructure Manager (Terraform)', org: 'Organization → folders → projects',
    zones: 'Regions, each with multiple zones', chips: 'TPUs (AI accelerators), Axion (Arm CPUs)',
    ai: 'Vertex AI (models, training, deployment, including Gemini)', cert: 'Google Cloud Certified Cloud Digital Leader',
    flagship: [['server', 'Compute Engine'], ['bucket', 'Cloud Storage'], ['container', 'Cloud Run'], ['db', 'BigQuery'], ['ai', 'Vertex AI'], ['cluster', 'GKE']]
  }
};

// [category, icon, concept, plain-language meaning, AWS, Azure, Google Cloud]
const ROSETTA = [
  ['Compute', 'server', 'Virtual machines', 'Rent a computer by the second', 'Amazon EC2', 'Azure Virtual Machines', 'Compute Engine'],
  ['Compute', 'fn', 'Serverless functions', 'Run code on an event; no servers to manage', 'AWS Lambda', 'Azure Functions', 'Cloud Run functions'],
  ['Compute', 'container', 'Serverless containers', 'Run a container without managing a cluster', 'AWS Fargate (with ECS)', 'Azure Container Apps', 'Cloud Run'],
  ['Compute', 'cluster', 'Managed Kubernetes', 'A managed cluster that schedules containers', 'Amazon EKS', 'Azure Kubernetes Service (AKS)', 'Google Kubernetes Engine (GKE)'],
  ['Compute', 'scale', 'Autoscaling groups', 'Add and remove identical VMs automatically', 'EC2 Auto Scaling', 'Virtual Machine Scale Sets', 'Managed instance groups'],
  ['Storage', 'bucket', 'Object storage', 'Files ("objects") in buckets, reached over HTTP', 'Amazon S3', 'Azure Blob Storage', 'Cloud Storage'],
  ['Storage', 'disk', 'Block storage', 'A virtual hard drive for one VM', 'Amazon EBS', 'Azure Managed Disks', 'Persistent Disk / Hyperdisk'],
  ['Storage', 'layers', 'Shared file storage', 'A network drive many servers mount', 'Amazon EFS', 'Azure Files', 'Filestore'],
  ['Storage', 'clock', 'Archive storage', 'Very cheap storage for data you rarely read', 'S3 Glacier storage classes', 'Blob Storage archive tier', 'Cloud Storage Archive class'],
  ['Databases', 'db', 'Managed relational', 'SQL databases the provider patches and backs up', 'Amazon RDS, Aurora', 'Azure SQL Database, Azure Database for PostgreSQL', 'Cloud SQL, AlloyDB'],
  ['Databases', 'db', 'NoSQL key-value / document', 'Fast lookups by key at any scale', 'Amazon DynamoDB', 'Azure Cosmos DB', 'Firestore, Bigtable'],
  ['Databases', 'cache', 'In-memory cache', 'Keep hot data in RAM for microsecond reads', 'Amazon ElastiCache', 'Azure Managed Redis', 'Memorystore'],
  ['Databases', 'chart', 'Data warehouse', 'SQL analytics over huge datasets', 'Amazon Redshift', 'Azure Synapse Analytics / Microsoft Fabric', 'BigQuery'],
  ['Networking', 'network', 'Private network', 'Your own isolated network in the cloud', 'Amazon VPC', 'Azure Virtual Network (VNet)', 'VPC network'],
  ['Networking', 'shield', 'Network firewall rules', 'Allow or deny traffic to resources', 'Security groups, network ACLs', 'Network security groups (NSGs)', 'VPC firewall rules'],
  ['Networking', 'lb', 'Load balancing', 'Spread traffic across healthy servers', 'Elastic Load Balancing', 'Azure Load Balancer, Application Gateway', 'Cloud Load Balancing'],
  ['Networking', 'cdn', 'Content delivery network', 'Cache content close to users', 'Amazon CloudFront', 'Azure Front Door', 'Cloud CDN'],
  ['Networking', 'dns', 'DNS', 'Turn names into addresses', 'Amazon Route 53', 'Azure DNS', 'Cloud DNS'],
  ['Networking', 'plug', 'Dedicated private link', 'A private line from your office or data center', 'AWS Direct Connect', 'Azure ExpressRoute', 'Cloud Interconnect'],
  ['Networking', 'gateway', 'API gateway', 'A managed front door for APIs', 'Amazon API Gateway', 'Azure API Management', 'API Gateway, Apigee'],
  ['Security', 'key', 'Identity & access', 'Who can do what to which resource', 'AWS IAM', 'Microsoft Entra ID + Azure RBAC', 'Cloud IAM'],
  ['Security', 'lock', 'Secrets', 'Store passwords and API keys safely', 'AWS Secrets Manager', 'Azure Key Vault', 'Secret Manager'],
  ['Security', 'key', 'Encryption keys', 'Create and control encryption keys', 'AWS KMS', 'Azure Key Vault', 'Cloud KMS'],
  ['Security', 'doc', 'Audit log', 'A record of every API call', 'AWS CloudTrail', 'Azure Activity Log', 'Cloud Audit Logs'],
  ['Operations', 'chart', 'Monitoring & logs', 'Metrics, logs, dashboards and alarms', 'Amazon CloudWatch', 'Azure Monitor', 'Cloud Monitoring, Cloud Logging'],
  ['Operations', 'code', 'Infrastructure as code', 'Describe infrastructure in files', 'AWS CloudFormation, CDK', 'ARM templates, Bicep', 'Infrastructure Manager (Terraform)'],
  ['Operations', 'box', 'Container registry', 'Store container images', 'Amazon ECR', 'Azure Container Registry', 'Artifact Registry'],
  ['Operations', 'dollar', 'Budgets & cost reports', 'See and cap what you spend', 'AWS Budgets, Cost Explorer', 'Microsoft Cost Management', 'Cloud Billing budgets & reports'],
  ['Integration', 'queue', 'Message queue', 'Hand work between services reliably', 'Amazon SQS', 'Azure Service Bus', 'Pub/Sub'],
  ['Integration', 'wave', 'Event streaming', 'Ingest a continuous stream of events', 'Amazon Kinesis Data Streams', 'Azure Event Hubs', 'Pub/Sub'],
  ['Integration', 'pipe', 'Workflow orchestration', 'Coordinate multi-step processes', 'AWS Step Functions', 'Azure Logic Apps', 'Workflows'],
  ['AI / ML', 'ai', 'ML platform', 'Train, tune and deploy your own models', 'Amazon SageMaker AI', 'Azure Machine Learning', 'Vertex AI'],
  ['AI / ML', 'ai', 'Foundation models', 'Call large pre-trained models through an API', 'Amazon Bedrock', 'Microsoft Foundry', 'Vertex AI (Gemini and others)'],
  ['AI / ML', 'gpu', 'AI accelerators', 'Chips for training and inference', 'NVIDIA GPU instances, Trainium, Inferentia', 'NVIDIA GPU VMs, Maia', 'NVIDIA GPU VMs, Cloud TPU']
];

// Resource hierarchies: [id, parent, label, kind, note]
const HIER = {
  aws: { policy: 'Service control policy (SCP)', bill: 'org', nodes: [
    ['org', null, 'Organization', 'root', 'Management account owns the organization and receives the consolidated bill.'],
    ['ouP', 'org', 'OU: Production', 'group', 'Organizational units group accounts so policies can be applied once.'],
    ['ouD', 'org', 'OU: Development', 'group', ''],
    ['aP', 'ouP', 'Account: pixelpost-prod', 'unit', 'An AWS account is the main isolation and billing boundary.'],
    ['aS', 'ouP', 'Account: security-logs', 'unit', ''],
    ['aD', 'ouD', 'Account: pixelpost-dev', 'unit', ''],
    ['r1', 'aP', 'EC2 instance', 'res', ''], ['r2', 'aP', 'S3 bucket', 'res', ''], ['r3', 'aD', 'EC2 instance', 'res', '']
  ] },
  azure: { policy: 'Azure Policy assignment', bill: 'sub', nodes: [
    ['org', null, 'Entra tenant · root group', 'root', 'The tenant holds identities; the root management group sits above every subscription.'],
    ['ouP', 'org', 'Mgmt group: Production', 'group', 'Management groups apply policy and access to many subscriptions.'],
    ['ouD', 'org', 'Mgmt group: Development', 'group', ''],
    ['aP', 'ouP', 'Subscription: pixelpost-prod', 'unit', 'A subscription is the billing and quota boundary.'],
    ['aD', 'ouD', 'Subscription: pixelpost-dev', 'unit', ''],
    ['aS', 'aP', 'Resource group: rg-web', 'unit2', 'Resource groups hold resources that share a lifecycle.'],
    ['r1', 'aS', 'Virtual machine', 'res', ''], ['r2', 'aS', 'Storage account', 'res', ''], ['r3', 'aD', 'Resource group: rg-test', 'unit2', '']
  ] },
  gcp: { policy: 'Organization policy constraint', bill: 'project', nodes: [
    ['org', null, 'Organization (example.com)', 'root', 'Tied to your company domain; policies and IAM set here apply everywhere below.'],
    ['ouP', 'org', 'Folder: Production', 'group', 'Folders group projects by team or environment.'],
    ['ouD', 'org', 'Folder: Development', 'group', ''],
    ['aP', 'ouP', 'Project: pixelpost-prod', 'unit', 'A project holds resources and is linked to a Cloud Billing account.'],
    ['aS', 'ouP', 'Project: shared-network', 'unit', ''],
    ['aD', 'ouD', 'Project: pixelpost-dev', 'unit', ''],
    ['r1', 'aP', 'Compute Engine VM', 'res', ''], ['r2', 'aP', 'Cloud Storage bucket', 'res', ''], ['r3', 'aD', 'Compute Engine VM', 'res', '']
  ] }
};
