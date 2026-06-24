import test from "node:test";
import assert from "node:assert/strict";

import { selectSavedInviteRoomResumeRoom } from "./saved-room-resume-state.js";

test("selectSavedInviteRoomResumeRoom returns null when no resumable room exists", () => {
  assert.equal(selectSavedInviteRoomResumeRoom([]), null);
  assert.equal(
    selectSavedInviteRoomResumeRoom([
      { room: { code: "a" }, priority: 0, updatedAt: 10, index: 0 },
    ]),
    null,
  );
});

test("selectSavedInviteRoomResumeRoom prefers highest priority room", () => {
  const result = selectSavedInviteRoomResumeRoom([
    { room: { code: "a" }, priority: 1, updatedAt: 20, index: 0 },
    { room: { code: "b" }, priority: 3, updatedAt: 10, index: 1 },
  ]);
  assert.equal(result.code, "b");
});

test("selectSavedInviteRoomResumeRoom breaks ties by recency and then original index", () => {
  const byRecency = selectSavedInviteRoomResumeRoom([
    { room: { code: "a" }, priority: 2, updatedAt: 10, index: 0 },
    { room: { code: "b" }, priority: 2, updatedAt: 20, index: 1 },
  ]);
  assert.equal(byRecency.code, "b");

  const byIndex = selectSavedInviteRoomResumeRoom([
    { room: { code: "a" }, priority: 2, updatedAt: 20, index: 0 },
    { room: { code: "b" }, priority: 2, updatedAt: 20, index: 1 },
  ]);
  assert.equal(byIndex.code, "a");
});
