// Optional local development server, without npm dependencies.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const upstream = new URL(process.env.API_URL || 'http://localhost:8080');
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
http.createServer((req,res)=> {
  if (req.url.startsWith('/api/')) {
    const proxy = http.request({hostname:upstream.hostname,port:upstream.port || 80,path:req.url.startsWith('/api/v1/') ? req.url : req.url.slice(4),method:req.method,headers:req.headers},response=> {
      res.writeHead(response.statusCode,response.headers); response.pipe(res);
    });
    proxy.on('error',()=> {res.writeHead(502,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'API indisponível. Inicie o back-end.'}));});
    req.pipe(proxy); return;
  }
  let url;
  try { url = decodeURIComponent(req.url.split('?')[0]); } catch {res.writeHead(400);res.end();return;}
  if (url === '/') url = '/index.html';
  if (url !== '/index.html' && !/^\/(css|js)\/[a-zA-Z0-9_.-]+$/.test(url)) {res.writeHead(404);res.end();return;}
  fs.readFile(path.join(__dirname,url),(err,data)=> {
    if (err) {res.writeHead(404);res.end();return;}
    res.writeHead(200,{'Content-Type':types[path.extname(url)] || 'application/octet-stream'});res.end(data);
  });
}).listen(Number(process.env.PORT || 5500),'127.0.0.1',()=>console.log('Front-end: http://localhost:'+(process.env.PORT || 5500)));
