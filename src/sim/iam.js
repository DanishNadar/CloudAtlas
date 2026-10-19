/* Simplified IAM identity-based policy evaluation (Chapter 8).
   Modeled: Allow/Deny statements with Action and Resource wildcards (* and ?). Explicit Deny overrides any Allow;
   with no matching Allow the result is an implicit deny.
   Not modeled: Conditions, NotAction/NotResource, resource-based policies, permission boundaries, SCPs/RCPs,
   session policies, cross-account rules, or service-specific authorization details. */
(function (G) {
  const SIM = G.SIM = G.SIM || {};
  const glob = (pat, val, ci) => {
    const esc = pat.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.');
    return new RegExp('^' + esc + '$', ci ? 'i' : '').test(val);
  };
  SIM.iamMatch = glob;

  SIM.iamActions = ['s3:GetObject', 's3:PutObject', 's3:DeleteObject', 's3:ListBucket', 's3:*', 'dynamodb:GetItem', 'dynamodb:PutItem', 'dynamodb:DeleteItem', 'dynamodb:*', '*'];
  SIM.iamResources = [
    'arn:aws:s3:::photos-bucket/*', 'arn:aws:s3:::photos-bucket', 'arn:aws:s3:::*',
    'arn:aws:dynamodb:us-east-1:123456789012:table/Orders', 'arn:aws:dynamodb:*:*:table/*', '*'
  ];
  SIM.iamRequests = [
    { id: 'r1', label: 'Show a user\'s photo', action: 's3:GetObject', resource: 'arn:aws:s3:::photos-bucket/users/42/avatar.jpg', needed: true },
    { id: 'r2', label: 'Upload a new photo', action: 's3:PutObject', resource: 'arn:aws:s3:::photos-bucket/users/42/new.jpg', needed: true },
    { id: 'r3', label: 'List photos in the bucket', action: 's3:ListBucket', resource: 'arn:aws:s3:::photos-bucket', needed: true },
    { id: 'r4', label: 'Record an order', action: 'dynamodb:PutItem', resource: 'arn:aws:dynamodb:us-east-1:123456789012:table/Orders', needed: true },
    { id: 'r5', label: 'Delete a photo', action: 's3:DeleteObject', resource: 'arn:aws:s3:::photos-bucket/users/42/avatar.jpg', needed: false },
    { id: 'r6', label: 'Delete an order record', action: 'dynamodb:DeleteItem', resource: 'arn:aws:dynamodb:us-east-1:123456789012:table/Orders', needed: false },
    { id: 'r7', label: 'Read the billing-exports bucket', action: 's3:GetObject', resource: 'arn:aws:s3:::billing-exports/2026-09.csv', needed: false }
  ];

  SIM.iamEval = (statements, action, resource) => {
    const matches = [];
    statements.forEach((s, i) => {
      const acts = [].concat(s.Action), ress = [].concat(s.Resource);
      if (acts.some(a => glob(a, action, true)) && ress.some(r => glob(r, resource, false))) matches.push(i);
    });
    const denies = matches.filter(i => statements[i].Effect === 'Deny');
    const allows = matches.filter(i => statements[i].Effect === 'Allow');
    if (denies.length) return { decision: 'ExplicitDeny', by: denies, matches };
    if (allows.length) return { decision: 'Allow', by: allows, matches };
    return { decision: 'ImplicitDeny', by: [], matches };
  };

  SIM.iamPresets = {
    admin: [{ Effect: 'Allow', Action: '*', Resource: '*' }],
    s3full: [{ Effect: 'Allow', Action: 's3:*', Resource: 'arn:aws:s3:::*' }, { Effect: 'Allow', Action: 'dynamodb:*', Resource: 'arn:aws:dynamodb:*:*:table/*' }],
    least: [
      { Effect: 'Allow', Action: ['s3:GetObject', 's3:PutObject'], Resource: 'arn:aws:s3:::photos-bucket/*' },
      { Effect: 'Allow', Action: 's3:ListBucket', Resource: 'arn:aws:s3:::photos-bucket' },
      { Effect: 'Allow', Action: 'dynamodb:PutItem', Resource: 'arn:aws:dynamodb:us-east-1:123456789012:table/Orders' }
    ],
    guard: [
      { Effect: 'Allow', Action: 's3:*', Resource: 'arn:aws:s3:::photos-bucket/*' },
      { Effect: 'Allow', Action: 's3:ListBucket', Resource: 'arn:aws:s3:::photos-bucket' },
      { Effect: 'Allow', Action: 'dynamodb:*', Resource: 'arn:aws:dynamodb:us-east-1:123456789012:table/Orders' },
      { Effect: 'Deny', Action: ['s3:DeleteObject', 'dynamodb:DeleteItem'], Resource: '*' }
    ],
    broken: [{ Effect: 'Allow', Action: ['s3:GetObject', 's3:PutObject', 's3:ListBucket'], Resource: 'arn:aws:s3:::photos-bucket/*' }]
  };
  SIM.iamJson = sts => JSON.stringify({ Version: '2012-10-17', Statement: sts }, null, 2);
})(typeof window !== 'undefined' ? window : globalThis);
