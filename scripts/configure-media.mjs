import {readFileSync,writeFileSync} from 'node:fs';
const bucket=process.argv[2];
if(!bucket||!(/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/).test(bucket)){console.error('Usage: npm run media:configure -- <existing-r2-bucket-name>');process.exit(1)}
const path=new URL('../wrangler.json',import.meta.url),config=JSON.parse(readFileSync(path,'utf8'));
config.r2_buckets=[...(config.r2_buckets||[]).filter(b=>b.binding!=='MEDIA'),{binding:'MEDIA',bucket_name:bucket}];
writeFileSync(path,JSON.stringify(config,null,2)+'\n');console.log('MEDIA binding configured. Commit wrangler.json and push to deploy.');
