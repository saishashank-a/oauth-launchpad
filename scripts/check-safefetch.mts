import assert from "node:assert/strict";
import { safeFetch, textContainsExcerpt, isPrivateAddress, htmlToText } from "../lib/safeFetch";

const mustReject = ["http://127.0.0.1", "http://169.254.169.254/latest", "http://localhost", "http://10.0.0.1", "http://intranet/",
  "http://[::1]/", "http://[::ffff:127.0.0.1]/", "http://example.com:8080/", "file:///etc/passwd", "http://foo.internal/", "http://192.168.1.1/", "http://localtest.me/"];
let failed = 0;
for (const u of mustReject) {
  try { await safeFetch(u, { timeoutMs: 3000 }); console.log(`FAIL accepted ${u}`); failed++; }
  catch (e) { console.log(`ok   rejected ${u} — ${(e as Error).message}`); }
}
for (const a of ["100.64.0.1", "172.16.5.4", "0.0.0.0", "fc00::1", "fe80::1", "::ffff:10.0.0.1"]) assert.ok(isPrivateAddress(a), a);
for (const a of ["93.184.215.14", "2606:4700::1111"]) assert.ok(!isPrivateAddress(a), a);
assert.ok(textContainsExcerpt("You  must register\nyour app’s “redirect URI”.", 'you must register your app\'s "redirect URI"'));
assert.ok(!textContainsExcerpt("You must register your app.", "you must not register your app"));

const page = await safeFetch("https://example.com");
assert.match(page.title, /Example Domain/);
assert.ok(page.text.includes("documentation examples"));
const fx = htmlToText("<html><head><title>T</title><script>evil()</script></head><body><nav>menu</nav><h2>Register <b>an app</b></h2><p>Go to &amp; click</p></body></html>");
assert.equal(fx.title, "T"); assert.ok(fx.text.includes("## Register an app") && fx.text.includes("Go to & click") && !/evil|menu/.test(fx.text), fx.text);
console.log(`ok   fetched https://example.com → "${page.title}", ${page.text.length} chars:\n${page.text.slice(0, 160)}`);
if (failed) process.exit(1);
console.log("all safeFetch checks passed");
