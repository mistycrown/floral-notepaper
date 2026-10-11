import { beforeEach, expect, test, vi } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import { setTileEdgeHide } from "./tileEdgeHide";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));
const invokeMock = vi.mocked(invoke);

beforeEach(() => {
  invokeMock.mockReset();
  invokeMock.mockResolvedValue(undefined);
});

test("restoration waits for pending enable and suspension updates", async () => {
  let finishEnable!: () => void;
  invokeMock.mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        finishEnable = resolve;
      }),
  );
  const enable = setTileEdgeHide(true);
  const suspend = setTileEdgeHide(true, true);
  const restore = setTileEdgeHide(false);
  await Promise.resolve();
  expect(invokeMock).toHaveBeenCalledTimes(1);
  finishEnable();
  await Promise.all([enable, suspend, restore]);
  expect(invokeMock.mock.calls).toEqual([
    ["set_tile_edge_hide", { enabled: true, suspended: false }],
    ["set_tile_edge_hide", { enabled: true, suspended: true }],
    ["set_tile_edge_hide", { enabled: false, suspended: false }],
  ]);
});

test("a failed enable does not prevent a subsequent restoration", async () => {
  invokeMock.mockRejectedValueOnce(new Error("window unavailable"));
  await expect(setTileEdgeHide(true)).rejects.toThrow("window unavailable");
  await expect(setTileEdgeHide(false)).resolves.toBeUndefined();
  expect(invokeMock).toHaveBeenLastCalledWith("set_tile_edge_hide", {
    enabled: false,
    suspended: false,
  });
});
