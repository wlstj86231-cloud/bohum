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
  '/guides/farm-machinery-purchase-record/',
  '/guides/used-farm-machinery-insurance-check/',
  '/guides/farm-machinery-incident-record/',
  '/method/'
];

if (urls.length !== expected.length || new Set(urls).size !== urls.length) {
  errors.push(`Sitemap URL count or uniqueness differs from the ${expected.length} public pages.`);
}

const titles = new Map();
const descriptions = new Map();
const inbound = new Map(expected.map((route) => [route, 0]));

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

  const title = (html.match(/<title>([^<]+)<\/title>/) || [])[1];
  const description = (html.match(/<meta name="description" content="([^"]+)"/) || [])[1];
  if (!title) errors.push(`${file}: missing title`);
  else if (titles.has(title)) errors.push(`${file}: duplicate title with ${titles.get(title)}`);
  else titles.set(title, file);
  if (!description) errors.push(`${file}: missing meta description`);
  else if (descriptions.has(description)) errors.push(`${file}: duplicate description with ${descriptions.get(description)}`);
  else descriptions.set(description, file);

  for (const match of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try { JSON.parse(match[1]); } catch { errors.push(`${file}: invalid JSON-LD`); }
  }

  if (route !== '/farm-assets/' && !html.includes('href="/farm-assets/')) errors.push(`${file}: no link to the record tool`);

  for (const match of html.matchAll(/(?:href|src)="(\/[^"#?]*)/g)) {
    const destination = match[1];
    const destinationFile = destination.endsWith('/') ? `${destination.slice(1)}index.html` : destination.slice(1);
    if (!fs.existsSync(path.join(root, destinationFile))) {
      errors.push(`${file}: broken local link ${destination}`);
    }
    if (inbound.has(destination) && destination !== route) inbound.set(destination, inbound.get(destination) + 1);
  }
}

for (const [route, count] of inbound) {
  if (route !== '/' && count === 0) errors.push(`Orphan page: nothing links to ${route}`);
}

const home = read('index.html');
for (const route of ['/farm-assets/', '/method/']) {
  if (!home.includes(`href="${route}"`)) errors.push(`Home missing ${route}`);
}
for (const notice of ['메가 심의필 2026-6236호', '메가주식회사 보험대리점(등록번호 제2005108004호)', '보험설계사 이정우', '개인정보관리책임자']) {
  if (!home.includes(notice)) errors.push(`Home missing required notice: ${notice}`);
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Validated ${expected.length} public routes: self canonicals, sitemap, H1s, unique titles and descriptions, JSON-LD, local links, record-tool links and home notices.`);
}
