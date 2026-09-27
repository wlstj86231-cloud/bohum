import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const siteUrl = 'https://megapureunasset.kr';
const errors = [];
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const sitemap = read('sitemap.xml');
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
const expected = [
  '/',
  '/farm-assets/',
  '/method/',
  '/guides/used-farm-machinery-insurance-check/',
  '/guides/farm-machinery-incident-record/'
];

if (urls.length !== expected.length || new Set(urls).size !== urls.length) {
  errors.push('Sitemap URL count or uniqueness differs from the five public pages.');
}

for (const route of expected) {
  const url = `${siteUrl}${route}`;
  const file = route === '/' ? 'index.html' : `${route.slice(1)}index.html`;
  if (!fs.existsSync(path.join(root, file))) {
    errors.push(`Missing ${file}`);
    continue;
  }
  const html = read(file);
  if (!urls.includes(url)) errors.push(`Sitemap missing ${url}`);
  if (!html.includes(`<link rel="canonical" href="${url}">`)) errors.push(`${file}: canonical mismatch`);
  if (!/<h1(?:\s|>)/i.test(html)) errors.push(`${file}: no server-visible H1`);
  if (/<meta\s+name="robots"\s+content="[^"]*noindex/i.test(html)) errors.push(`${file}: noindex`);
  for (const match of html.matchAll(/href="(\/[^"#?]*)"/g)) {
    const destination = match[1];
    const destinationFile = destination.endsWith('/') ? `${destination.slice(1)}index.html` : destination.slice(1);
    if (!fs.existsSync(path.join(root, destinationFile))) {
      errors.push(`${file}: broken local link ${destination}`);
    }
  }
}

const home = read('index.html');
for (const route of ['/farm-assets/', '/method/']) {
  if (!home.includes(`href="${route}"`)) errors.push(`Home missing ${route}`);
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Validated five public routes, self canonicals, sitemap, H1s and local links.');
}
