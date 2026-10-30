// concarne test entry: runs every case file sequentially in one run.
// Usage: carne run tests/run.js (from the package root).
var basics = require("./test_basics.js");
var router = require("./test_router.js");
var bodies = require("./test_bodies.js");
var errors = require("./test_errors.js");

(async () => {
  await basics.run();
  await router.run();
  await bodies.run();
  await errors.run();
  console.log("all concarne tests passed");
})();
