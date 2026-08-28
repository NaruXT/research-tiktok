import test from "node:test";
import assert from "node:assert/strict";
import { approveGate } from "../src/lib/trust-ladder.js";
import { isolate } from "./helpers.js";

test("T0 passes through silently, no killswitch dir needed", async () => {
  await isolate();
  await approveGate({ isJson: true, flags: {} }, {}, { trust: "T0", yes: false });
});

test("T2 in JSON/non-interactive mode throws instead of prompting", async () => {
  await isolate();
  await assert.rejects(
    () => approveGate({ isJson: true, flags: {} }, { would: "post" }, { trust: "T2", yes: false }),
    (err) => {
      assert.equal(err.code, "CONFIRMATION_REQUIRED");
      return true;
    }
  );
});

test("T2 with --yes passes without prompting, even in JSON mode", async () => {
  await isolate();
  await approveGate({ isJson: true, flags: {} }, { would: "post" }, { trust: "T2", yes: true });
});
