// concarne: Express-like web framework for Carne.
// Pure JS on top of std/http: routing, middleware, parsed req, res helpers.
//
//   const concarne = require("pkg/concarne");
//   const app = concarne();
//   app.get("/users/:id", (req, res) => res.json({id: req.params.id}));
//   app.listen(3000);
//
// Handlers are synchronous in v1 (the runtime expects the response back
// from the serve handler, so async route handlers cannot work yet).

var http = require("std/http");
var routerLib = require("./lib/router.js");
var createDispatcher = routerLib.createDispatcher;
var compilePath = routerLib.compilePath;
var HttpError = require("./lib/request.js").HttpError;

function flattenInto(out, fns) {
  for (var i = 0; i < fns.length; i++) {
    if (Array.isArray(fns[i])) flattenInto(out, fns[i]);
    else out.push(fns[i]);
  }
  return out;
}

function concarne() {
  var stack = [];

  function use(path, fns) {
    if (typeof path === "function" || Array.isArray(path)) {
      fns = [path].concat(fns || []);
      path = null;
    } else if (Array.isArray(fns)) {
      fns = fns;
    } else {
      fns = fns === undefined ? [] : [fns];
    }
    var flat = flattenInto([], fns);
    if (flat.length === 0) {
      throw new Error("concarne.use: handler is not a function");
    }
    for (var i = 0; i < flat.length; i++) {
      if (typeof flat[i] !== "function") {
        throw new Error("concarne.use: handler is not a function");
      }
      stack.push({
        type: "middleware",
        path: path,
        fn: flat[i],
        isError: flat[i].length === 4
      });
    }
    return app;
  }

  function addRoute(method, path, fns) {
    var flat = flattenInto([], fns);
    if (flat.length === 0) {
      throw new Error("concarne: route " + method + " " + path + " needs a handler");
    }
    for (var i = 0; i < flat.length; i++) {
      if (typeof flat[i] !== "function") {
        throw new Error("concarne: route handler is not a function");
      }
      stack.push({type: "route", method: method, path: path, fn: flat[i]});
    }
    return app;
  }

  // Routes compile lazily on first listen so registration stays cheap.
  var compiled = false;
  function ensureCompiled() {
    if (compiled) return;
    for (var i = 0; i < stack.length; i++) {
      if (stack[i].type === "route") {
        stack[i].compiled = compilePath(stack[i].path);
      }
    }
    compiled = true;
  }

  var app = {
    use: use,
    get: function (path) {
      return addRoute("GET", path, Array.prototype.slice.call(arguments, 1));
    },
    post: function (path) {
      return addRoute("POST", path, Array.prototype.slice.call(arguments, 1));
    },
    put: function (path) {
      return addRoute("PUT", path, Array.prototype.slice.call(arguments, 1));
    },
    patch: function (path) {
      return addRoute("PATCH", path, Array.prototype.slice.call(arguments, 1));
    },
    all: function (path) {
      return addRoute("ALL", path, Array.prototype.slice.call(arguments, 1));
    },
    listen: function (port, host, cb) {
      if (typeof host === "function") {
        cb = host;
        host = undefined;
      }
      ensureCompiled();
      var handler = createDispatcher(stack);
      var srv = host === undefined
        ? http.serve(port, handler)
        : http.serve(port, host, handler);
      app._server = {port: srv.port, host: srv.host};
      if (cb) cb(app._server);
      return {
        port: srv.port,
        host: srv.host,
        close: function () { return app.close(); }
      };
    },
    close: function () {
      if (!app._server) return false;
      var ok = http.close(app._server.port);
      app._server = null;
      return ok;
    }
  };
  app["delete"] = function (path) {
    return addRoute("DELETE", path, Array.prototype.slice.call(arguments, 1));
  };
  return app;
}

module.exports = concarne;
module.exports.HttpError = HttpError;
