node -e '
const { createServer } = require("node:http");
const { exec } = require("node:child_process");
const html = `
<html>
  <script src="https://cdn.tailwindcss.com"></script>
  <script async src="${process.env.API_URL}/client.js" data-pulsio-id="${process.env.PULSIO_USER_ID}"></script>
  <body class="h-screen bg-slate-950 text-slate-100 grid place-content-center text-center">
    <h1 class="text-xl text-slate-300 mb-6">This is a dummy website to test <br>your tracking snippet.</h1>
    <a target="_blank" href="${process.env.WEBAPP_URL}" class="peer bg-blue-600 hover:bg-blue-500 hover:scale-105 text-white px-4 py-2 rounded-xl transition inline-block cursor-pointer">
      Check dashboard
    </a>
    <strong id="snippet-tested" class="hidden peer-focus:block text-emerald-400 mt-4">Great!</strong>
  </body>
</html>
`;
const openCmd = process.platform === "darwin" ? "open" : "xdg-open";
const server = createServer((_, res) => res.writeHead(200, { "Content-Type": "text/html" }).end(html))
server.listen(81, () => exec(`${openCmd} http://lvh.me:81`));
'
