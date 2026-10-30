// concarne router: method + path matching with :params and * wildcards,
// prefix-scoped middleware with next(), 4-arg error middleware by arity.
// Everything is synchronous: the runtime calls the serve handler and
// expects the response back, so async route handlers cannot work in v1.

var wrapRequest = require("./request.js").wrapRequest;
var createResponse = require("./response.js").createResponse;

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function compilePath(path) {
  if (path === "/") {
    return {regex: /^\/?$/, keys: [], wildcards: 0};
  }
  var keys = [];
  var wildcards = 0;
  var parts = path.split("/").map(function (seg) {
    if (seg === "*") {
      wildcards++;
      return "(.*)";
    }
    if (seg[0] === ":") {
      keys.push(seg.slice(1));
      return "([^/]+)";
    }
    return escapeRegex(seg);
  });
  return {regex: new RegExp("^" + parts.join("/") + "/?$"), keys: keys, wildcards: wildcards};
}

function decodeParam(s) {
  try {
    return decodeURIComponent(s);
  } catch (e) {
    return s;
  }
}

function matchPrefix(layerPath, reqPath) {
  if (layerPath === null || layerPath === "/") return true;
  return reqPath === layerPath || reqPath.slice(0, layerPath.length + 1) === layerPath + "/";
}

function defaultNotFound(req, res) {
  res.status(404).json({error: "Not Found", path: req.path});
}

function defaultError(err, req, res) {
  var status = (err && (err.status || err.statusCode)) || 500;
  if (typeof status !== "number" || status < 100 || status > 599) status = 500;
  var message = err && err.message ? err.message : String(err);
  res.status(status).json({error: message});
}

function flattenFns(fns) {
  var out = [];
  for (var i = 0; i < fns.length; i++) {
    if (Array.isArray(fns[i])) {
      var inner = flattenFns(fns[i]);
      for (var j = 0; j < inner.length; j++) out.push(inner[j]);
    } else {
      out.push(fns[i]);
    }
  }
  return out;
}

function createDispatcher(stack) {
  return function dispatch(rawReq) {
    var req = wrapRequest(rawReq);
    var res = createResponse();
    var idx = 0;
    var err = undefined;
    var clearOnNext = false;
    function next(e) {
      if (e !== undefined) {
        err = e;
        clearOnNext = false;
      } else if (clearOnNext) {
        err = undefined;
        clearOnNext = false;
      }
      while (idx < stack.length) {
        var layer = stack[idx++];
        if (layer.type === "middleware") {
          if (!matchPrefix(layer.path, req.path)) continue;
          if (err !== undefined) {
            if (!layer.isError) continue;
            clearOnNext = true;
            try {
              layer.fn(err, req, res, next);
            } catch (e2) {
              err = e2;
              clearOnNext = false;
              continue;
            }
            return;
          }
          if (layer.isError) continue;
          try {
            layer.fn(req, res, next);
          } catch (e2) {
            err = e2;
            continue;
          }
          return;
        }
        // route layer
        if (err !== undefined) continue;
        if (layer.method !== "ALL" && layer.method !== req.method) continue;
        var m = layer.compiled.regex.exec(req.path);
        if (!m) continue;
        var params = {};
        for (var k = 0; k < layer.compiled.keys.length; k++) {
          params[layer.compiled.keys[k]] = decodeParam(m[k + 1]);
        }
        for (var w = 0; w < layer.compiled.wildcards; w++) {
          params[String(w)] = decodeParam(m[layer.compiled.keys.length + w + 1]);
        }
        req.params = params;
        try {
          layer.fn(req, res, next);
        } catch (e2) {
          err = e2;
          continue;
        }
        return;
      }
      if (!res.sent) {
        if (err !== undefined) defaultError(err, req, res);
        else defaultNotFound(req, res);
      }
    }
    next();
    return res.toRuntime();
  };
}

module.exports = {
  compilePath: compilePath,
  createDispatcher: createDispatcher
};
