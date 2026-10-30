// concarne response: collects status/headers/body, maps onto the
// runtime's {status, headers, body} handler return. All mutators are
// chainable. Sending twice is a no-op (first send wins).

var STATUS_TEXTS = {
  200: "OK",
  201: "Created",
  204: "No Content",
  301: "Moved Permanently",
  302: "Found",
  304: "Not Modified",
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  405: "Method Not Allowed",
  409: "Conflict",
  422: "Unprocessable Entity",
  500: "Internal Server Error",
  501: "Not Implemented",
  503: "Service Unavailable"
};

var MIME = {
  html: "text/html; charset=utf-8",
  json: "application/json; charset=utf-8",
  text: "text/plain; charset=utf-8",
  css: "text/css; charset=utf-8",
  js: "text/javascript; charset=utf-8",
  xml: "application/xml; charset=utf-8"
};

function createResponse() {
  var res = {
    statusCode: 200,
    headers: {},
    body: "",
    sent: false,
    status: function (code) {
      res.statusCode = code;
      return res;
    },
    set: function (field, value) {
      if (typeof field === "object" && field !== null) {
        for (var k in field) {
          if (Object.prototype.hasOwnProperty.call(field, k)) {
            res.headers[k] = String(field[k]);
          }
        }
      } else {
        res.headers[field] = String(value);
      }
      return res;
    },
    get: function (field) {
      return res.headers[field];
    },
    type: function (t) {
      if (t.indexOf("/") >= 0) {
        return res.set("Content-Type", t);
      }
      return res.set("Content-Type", MIME[t] || t);
    },
    json: function (obj) {
      if (res.sent) return res;
      res.set("Content-Type", MIME.json);
      var text = JSON.stringify(obj);
      res.body = text === undefined ? "null" : text;
      res.sent = true;
      return res;
    },
    send: function (payload) {
      if (res.sent) return res;
      if (typeof payload === "number") {
        res.statusCode = payload;
        res.set("Content-Type", MIME.text);
        res.body = STATUS_TEXTS[payload] || "";
        res.sent = true;
        return res;
      }
      if (typeof payload === "object" && payload !== null) {
        return res.json(payload);
      }
      if (res.headers["Content-Type"] === undefined) {
        res.set("Content-Type", MIME.html);
      }
      res.body = payload === undefined ? "" : String(payload);
      res.sent = true;
      return res;
    },
    end: function (payload) {
      if (res.sent) return res;
      if (payload !== undefined) {
        res.body = String(payload);
      }
      res.sent = true;
      return res;
    },
    redirect: function (url, code) {
      if (res.sent) return res;
      res.statusCode = code || 302;
      res.set("Location", url);
      res.set("Content-Type", MIME.text);
      res.body = (STATUS_TEXTS[res.statusCode] || "Redirect") + ": " + url;
      res.sent = true;
      return res;
    },
    toRuntime: function () {
      return {
        status: res.statusCode,
        headers: res.headers,
        body: typeof res.body === "string" ? res.body : String(res.body)
      };
    }
  };
  return res;
}

module.exports = {
  createResponse: createResponse,
  STATUS_TEXTS: STATUS_TEXTS
};
