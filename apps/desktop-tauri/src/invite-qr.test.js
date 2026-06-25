import assert from "node:assert/strict";
import test from "node:test";

import { productionInviteCodeProfiles } from "./action-state.js";
import {
  buildInviteQrSvgDataUrl,
  detectedInviteQrPayload,
  inviteQrImportAvailability,
  inviteQrMatrix,
  normalizeInviteQrPayload,
} from "./invite-qr.js";

test("decoded invite qr payload normalization keeps pairwise identity stable for the same code", () => {
  const decoded = normalizeInviteQrPayload("  abcd-2345  ");
  assert.equal(decoded, "abcd-2345");
  assert.deepEqual(productionInviteCodeProfiles(decoded, "joiner"), {
    connectionCode: "abcd-2345",
    role: "joiner",
    slug: "abcd-2345",
    localProfile: "joiner-abcd-2345",
    peerProfile: "inviter-abcd-2345",
  });
});

test("invite qr matrix renders a version-3 square with finder corners", () => {
  const matrix = inviteQrMatrix("ABCD-2345");
  assert.equal(matrix.length, 29);
  assert.equal(matrix[0].length, 29);
  assert.equal(matrix[3][3], true);
  assert.equal(matrix[3][25], true);
  assert.equal(matrix[25][3], true);
});

test("invite qr svg output stays self-contained", () => {
  const svgUrl = buildInviteQrSvgDataUrl("ABCD-2345");
  assert.match(svgUrl, /^data:image\/svg\+xml;charset=utf-8,/);
  assert.match(svgUrl, /Invite%20code%20QR/);
});

test("detected invite qr payload trims the first decodable raw value", () => {
  assert.equal(
    detectedInviteQrPayload([{ rawValue: "   " }, { rawValue: "  abcd-2345  " }, { rawValue: "ignored" }]),
    "abcd-2345",
  );
});

test("detected invite qr payload fails closed when detector returns no usable code", () => {
  assert.throws(() => detectedInviteQrPayload([{ rawValue: "" }, {}]), /qr-import-empty/);
});

test("invite qr import availability stays false outside supported browser runtime", () => {
  assert.deepEqual(inviteQrImportAvailability(), { supported: false });
});
