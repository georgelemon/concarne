// Shared test helper: check() throws on failure (uncaught -> exit 1).

function check(cond, msg) {
  if (!cond) throw new Error("FAIL: " + msg);
  console.log("ok: " + msg);
}

module.exports = {check: check};
