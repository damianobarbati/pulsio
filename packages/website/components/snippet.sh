node -e '
const { createServer } = require("node:http");
const { exec } = require("node:child_process");
const html = `
<html>
  <script src="https://cdn.tailwindcss.com"></script>
  <script async src="${process.env.API_URL}/client.js" data-pulsio-id="${process.env.PULSIO_USER_ID}"></script>
  <body class="h-screen bg-slate-950 text-slate-100 grid place-content-center text-center">
    <h1 class="text-xl text-slate-300 mb-6">This is a dummy website to test <br>your tracking snippet.</h1>
    <a
      target="_blank"
      href="${process.env.WEBAPP_URL}"
      class="peer text-white bg-blue-600 hover:scale-105 py-2 rounded-md transition cursor-pointer"
      data-pulsio-event="snippet-run"
      data-pulsio-trigger="visible"
    >
      Check dashboard
    </a>
    <strong id="snippet-tested" class="hidden peer-focus:block text-emerald-400 mt-4" data-pulsio-event="snippet-click" data-pulsio-trigger="visible">Great!</strong>
  </body>
</html>
`;
const openCmd = process.platform === "darwin" ? "open" : "xdg-open";
const server = createServer((_, res) => res.writeHead(200, { "Content-Type": "text/html" }).end(html));
server.listen(0, "127.0.0.1", () => {
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Could not start temporary site.");
  exec(`${openCmd} http://localtest.me:${address.port}`);
});
'
