import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extractArticle, parseFeed, fetchUrl } from '../../src/lib/ingestion/fetchers.ts';

describe('extractArticle', () => {
  it('prefers og:title and strips page chrome', () => {
    const html = `
      <html><head>
        <title>Fallback title | Site</title>
        <meta property="og:title" content="The Real Title" />
        <style>.x{color:red}</style>
        <script>alert('nope')</script>
      </head><body>
        <nav><a href="/">Home</a><a href="/about">About</a></nav>
        <article>
          <h1>The Real Title</h1>
          <p>First paragraph of the piece.</p>
          <p>Second paragraph with an &amp; entity.</p>
        </article>
        <footer>Copyright</footer>
      </body></html>`;
    const { title, text } = extractArticle(html);
    assert.equal(title, 'The Real Title');
    assert.ok(text.includes('First paragraph of the piece.'));
    assert.ok(text.includes('Second paragraph with an & entity.'));
    assert.ok(!text.includes('alert'), 'script content leaked');
    assert.ok(!text.includes('color:red'), 'style content leaked');
    assert.ok(!text.includes('Copyright'), 'footer chrome leaked');
    assert.ok(!text.includes('About'), 'nav chrome leaked');
  });

  it('falls back to <title> and full body when no <article>', () => {
    const html = `<html><head><title>Plain Page</title></head>
      <body><p>Body text here.</p></body></html>`;
    const { title, text } = extractArticle(html);
    assert.equal(title, 'Plain Page');
    assert.ok(text.includes('Body text here.'));
  });
});

describe('parseFeed', () => {
  it('parses RSS 2.0 items with CDATA titles', () => {
    const xml = `<?xml version="1.0"?><rss version="2.0"><channel>
      <title>Feed</title>
      <item>
        <title><![CDATA[First <b>post</b>]]></title>
        <link>https://example.com/one</link>
        <description>Summary one</description>
        <pubDate>Mon, 01 Jun 2026 10:00:00 GMT</pubDate>
      </item>
      <item><title>Second</title><link>https://example.com/two</link></item>
    </channel></rss>`;
    const items = parseFeed(xml);
    assert.equal(items.length, 2);
    assert.equal(items[0].title, 'First post');
    assert.equal(items[0].url, 'https://example.com/one');
    assert.equal(items[0].summary, 'Summary one');
    assert.ok(items[0].publishedAt?.includes('2026'));
  });

  it('parses Atom entries via link href', () => {
    const xml = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom">
      <entry>
        <title>Atom post</title>
        <link rel="alternate" href="https://example.com/atom-1" />
        <summary>Atom summary</summary>
        <published>2026-06-01T10:00:00Z</published>
      </entry>
    </feed>`;
    const items = parseFeed(xml);
    assert.equal(items.length, 1);
    assert.equal(items[0].title, 'Atom post');
    assert.equal(items[0].url, 'https://example.com/atom-1');
    assert.equal(items[0].summary, 'Atom summary');
  });

  it('skips entries without a resolvable url', () => {
    const xml = `<rss><channel><item><title>No link</title></item></channel></rss>`;
    assert.equal(parseFeed(xml).length, 0);
  });
});

describe('fetchUrl guards (no network needed)', () => {
  it('rejects non-http protocols', async () => {
    await assert.rejects(() => fetchUrl('file:///etc/passwd'), /Only http/);
    await assert.rejects(() => fetchUrl('ftp://example.com/x'), /Only http/);
  });

  it('refuses private and loopback hosts', async () => {
    for (const url of [
      'http://localhost/x',
      'http://127.0.0.1/x',
      'http://10.0.0.5/x',
      'http://192.168.1.1/x',
      'http://172.16.0.9/x',
      'http://169.254.169.254/latest/meta-data',
      'http://internal.local/x',
    ]) {
      await assert.rejects(() => fetchUrl(url), /private|loopback/i, url);
    }
  });
});
