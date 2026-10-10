// 离线缓存（PWA）：界面文件缓存起来，打开更快、断网也能看到界面；接口请求（/v1/）一律走网络，不缓存病情数据。
const SHELL = 'elbow-shell-v3'
// 所在路径：自己部署时是 /，GitHub Pages 上是 /elbowAI/
const BASE = new URL(self.registration.scope).pathname
self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll([BASE, BASE + 'manifest.webmanifest', BASE + 'icons/icon-192.png'])).then(() => self.skipWaiting()))
})
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== SHELL).map(k => caches.delete(k))))
    // 旧版本的脚本和样式（文件名带哈希）只留最近 30 个
    .then(() => caches.open(SHELL)).then(c => c.keys().then(rs => Promise.all(rs.filter(r => new URL(r.url).pathname.startsWith(BASE + 'assets/')).slice(0, -30).map(r => c.delete(r)))))
    .then(() => self.clients.claim()))
})
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url)
  if (e.request.method !== 'GET' || u.origin !== location.origin || u.pathname.startsWith('/v1/')) return   // 接口（含另一个域名的后端）不经过缓存
  if (u.pathname.startsWith(BASE + 'assets/') || u.pathname.startsWith(BASE + 'icons/')) {
    // 文件名带内容哈希：先用缓存
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(res => { if (res.ok) { const c = res.clone(); caches.open(SHELL).then(x => x.put(e.request, c)) } return res })))
    return
  }
  if (e.request.mode === 'navigate') {
    // 页面：先走网络拿最新版本，断网时用缓存
    // 页面：绕过浏览器的 HTTP 缓存直接问服务器（发布新版后马上生效），断网时用缓存
    e.respondWith(fetch(e.request, { cache: 'no-cache' }).then(res => { if (res.ok) { const c = res.clone(); caches.open(SHELL).then(x => x.put(BASE, c)) } return res }).catch(() => caches.match(BASE)))
  }
})
