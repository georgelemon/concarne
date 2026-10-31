<p align="center">
  <img src="https://github.com/openpeeps/carne/blob/main/.github/carne_logo.png" alt="Carne Logo" width="140px" height="140px"><br>
  <strong>ConCarne</strong>, an Express-like web framework for <a href="https://github.com/openpeeps/carne">Carne</a><br>
  Routing, middleware and JSON APIs in pure JS on top of <code>std/http</code>.
</p>

## Install

```bash
carne pkg install concarne
```

Or link a checkout while developing:

```bash
carne pkg develop /path/to/concarne
```

## Usage

```js
const concarne = require("pkg/concarne");
const app = concarne();

app.use((req, res, next) => {
  console.log(req.method + " " + req.url);
  next();
});

app.get("/users/:id", (req, res) => res.json({id: req.params.id}));
app.post("/users", (req, res) => res.status(201).json({id: "3"}));

app.use((err, req, res, next) => {
  res.status(err.status || 500).json({error: err.message});
});

app.listen(3000);
```

## API

Routes: `app.get/post/put/patch/delete/all(path, ...handlers)`. Paths take
`:params`, `*` wildcards (as `req.params["0"]`, spanning slashes), and an
optional trailing slash. Handlers arrays are flattened, so
`app.get(p, [a, b], c)` runs `a`, `b`, `c` in order.

Middleware: `app.use([path, ]...fns)`. Runs in registration order for its
path prefix (`"/api"` matches `/api` and below; `"/"` matches all).
Four-arg functions are error middleware and only run after `next(err)` or
a throw. Unmatched requests answer `404 {error, path}`; unhandled errors
answer `500 {error}`.

`req`: `method`, `path`, `url`, `headers`, `params`, plus lazy `query`
(repeated keys become arrays, `+` decodes to space), `body` (parsed JSON
for JSON content types with a 400 on invalid input, parsed pairs for
urlencoded forms, raw string otherwise), and `cookies`. `req.get(name)`
reads a header case-insensitively; `req.rawBody` is the untouched string.

`res` (all chainable): `status(code)`, `set(field, value)` / `set(obj)`,
`type(name)` (`html`, `json`, `text`, `css`, `js`, `xml`, or a full
content type), `send(string|object|number)`, `json(obj)`,
`redirect(url[, code])`, `end([body])`. First send wins; later sends are
ignored. `concarne.HttpError(status, message)` builds errors the default
handler respects.

`app.listen(port[, host][, opts][, cb])` returns `{port, host, workers,
close}`; `app.close()` stops the server (`false` when not listening).
Servers hold the event loop until closed, like Node. `opts` passes
through to `std/http`: `{workers?, keepAliveMs?, readTimeoutMs?,
maxBodySize?}`. The default `workers: 1` serves single-threaded;
`workers: N` (2..64) serves from N full runtimes sharing the port.

```js
const app = concarne();
app.get("/hi/:name", (req, res) => res.send("hi " + req.params.name));

// Single: app.listen(3000);
// Multi (see examples/workers.js):
app.listen(3000, {workers: 4});
```

## Limits in v1

Sync route handlers only (the runtime expects the response back from the
serve handler). No static file serving (use `std/fs` directly for text).
CommonJS only, like every Carne package.

With `workers > 1` each worker is an isolated runtime re-running your
script: no shared state, and module-level side effects (counters, caches,
`require` setup) run once per worker. Gate driver code on
`process.isWorker` (`false` on main, `true` on workers): every context
must call `app.listen`, but only main should fetch/assert/close.

```js
const app = concarne();
app.get("/", (req, res) => res.send("hi"));
app.listen(3000, {workers: 4});
if (!process.isWorker) {
  // driver: fetch, test, then app.close()
}
```

## Tests

```bash
carne run tests/run.js          # single-worker suite
carne run tests/run_workers.js  # multi-worker suite (own process)
```

## License

MIT.
