import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const siteUrl = 'https://megapureunasset.kr';
const errors = [];
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const sitemap = read('sitemap.xml');
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);

// Pages with publisher content (ads allowed) and the record tool
const contentRoutes = [
  '/',
  '/farm-assets/',
  '/guides/farm-machinery-purchase-record/',
  '/guides/farm-machinery-inspection-by-type/',
  '/guides/farm-machinery-maintenance-log/',
  '/guides/farm-machinery-safety-rules/',
  '/guides/used-farm-machinery-insurance-check/',
  '/guides/farm-machinery-incident-record/'
];
// Site-information pages (no ad code; verification meta only)
const infoRoutes = ['/about/', '/contact/', '/method/', '/corrections/', '/privacy/', '/terms/'];
const expected = [...contentRoutes, ...infoRoutes];
// Article and tool pages need the visible meta block, sources and scope note
const articleRoutes = contentRoutes.filter((route) => route !== '/');

const ORG_ID = 'https://jnewmedia.com/#organization';
const ADSENSE_SCRIPT = 'pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5877883031077615';
const ADSENSE_META = '<meta name="google-adsense-account" content="ca-pub-5877883031077615">';
const OPERATOR_LINE = '제이 미디어(Media) · 대표 이정우 · 사업자등록번호 456-33-01705 · 고객센터';
const FOOTER_LINKS = ['/about/', '/contact/', '/method/', '/privacy/', '/terms/'];

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

  // Structured data: valid JSON, Organization by @id, page dates match the visible meta block
  const graphs = [];
  for (const match of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try { graphs.push(JSON.parse(match[1])); } catch { errors.push(`${file}: invalid JSON-LD`); }
  }
  const nodes = graphs.flatMap((g) => g['@graph'] || [g]);
  if (!nodes.some((n) => n['@type'] === 'Organization' && n['@id'] === ORG_ID)) errors.push(`${file}: JSON-LD lacks the operator Organization`);
  const pageNode = nodes.find((n) => n.url === url && n['@type'] !== 'WebApplication');
  if (!pageNode) errors.push(`${file}: JSON-LD lacks a node for this page`);
  else if (!pageNode.publisher || pageNode.publisher['@id'] !== ORG_ID) errors.push(`${file}: page publisher is not the operator @id`);

  // Shared footer with operator line and site-information links
  const footer = (html.match(/<footer class="site-footer">([\s\S]*?)<\/footer>/) || [])[1] || '';
  if (!footer.includes(OPERATOR_LINE)) errors.push(`${file}: footer missing operator line`);
  for (const link of FOOTER_LINKS) if (!footer.includes(`href="${link}"`)) errors.push(`${file}: footer missing ${link}`);

  // Ad code only on content pages; verification meta on information pages
  if (contentRoutes.includes(route) && !html.includes(ADSENSE_SCRIPT)) errors.push(`${file}: missing AdSense code`);
  if (infoRoutes.includes(route)) {
    if (html.includes('adsbygoogle.js')) errors.push(`${file}: information page should not load ad code`);
    if (!html.includes(ADSENSE_META)) errors.push(`${file}: missing google-adsense-account meta`);
  }

  if (articleRoutes.includes(route)) {
    const meta = (html.match(/<p class="meta-line">([\s\S]*?)<\/p>/) || [])[1] || '';
    const published = (meta.match(/게시일 (\d{4}-\d{2}-\d{2})/) || [])[1];
    if (!meta.includes('작성·관리') || !published || !/최종 확인일 \d{4}-\d{2}-\d{2}/.test(meta) || !/출처 \d+곳/.test(meta)) {
      errors.push(`${file}: meta block needs 작성·관리, 게시일, 최종 확인일 and 출처 수`);
    }
    if (pageNode && published && pageNode.datePublished !== published) errors.push(`${file}: JSON-LD datePublished differs from visible 게시일`);
    const sources = (html.match(/<section[^>]*id="sources"[\s\S]*?<\/section>/) || [])[0];
    if (!sources) errors.push(`${file}: no 출처 section`);
    else {
      const count = Number((meta.match(/출처 (\d+)곳/) || [])[1]);
      const listed = (sources.match(/<li[\s>]/g) || []).length;
      if (count && listed !== count) errors.push(`${file}: meta says ${count} sources but the list has ${listed}`);
      if (!sources.includes('확인일')) errors.push(`${file}: sources lack 확인일`);
    }
    if (!html.includes('범위와 한계')) errors.push(`${file}: no 범위와 한계 note`);
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
for (const route of ['/farm-assets/', '/method/', '/about/']) {
  if (!home.includes(`href="${route}"`)) errors.push(`Home missing ${route}`);
}
// Insurance agency notices and the consultation form must stay word for word
for (const notice of [
  '메가 심의필 2026-6236호',
  '메가주식회사 보험대리점(등록번호 제2005108004호)',
  '보험설계사 이정우',
  '개인정보관리책임자',
  '※ 상기 내용은 메가( 주 ) 이정우 의 의견이며',
  'Copyright © 2026 메가 ( 주 ) 설계사 이정우 All rights reserved.',
  "https://docs.google.com/forms/d/1R81fz4Jm2qRHJkVvw5n1beop2h8IsBgFM2Xjn3ZogdI/formResponse",
  "{ name: '242227916', phone: '1630132293' }"
]) {
  if (!home.includes(notice)) errors.push(`Home missing required notice: ${notice}`);
}

if (read('ads.txt').trim() !== 'google.com, pub-5877883031077615, DIRECT, f08c47fec0942fa0') errors.push('ads.txt changed');
if (/^\s*Disallow:\s*\/\s*$/im.test(read('robots.txt'))) errors.push('robots.txt blocks the site');

if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Validated ${expected.length} public routes: self canonicals, sitemap, H1s, unique titles and descriptions, JSON-LD operator and dates, footer operator line and links, meta blocks, sources and scope notes, ad-code placement, local links, record-tool links and home notices.`);
}
