import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  RESULT_SCHEMA_VERSION,
  TASK_SCHEMA_VERSION,
  serializeAndWriteTaskDefinition,
  serializeAndWriteTaskResult,
} from "../serializer";

const EFFECT_ID = "01HQA4SERIALZR";

describe("task serializer", () => {
  let runDir: string;

  beforeEach(async () => {
    runDir = await fs.mkdtemp(path.join(os.tmpdir(), "babysitter-serializer-"));
  });

  afterEach(async () => {
    await fs.rm(runDir, { recursive: true, force: true });
  });

  it("writes task.json with schema metadata and inline inputs", async () => {
    const { taskRef, inputsRef, serialized } = await serializeAndWriteTaskDefinition({
      runDir,
      effectId: EFFECT_ID,
      taskId: "inline-input-task",
      invocationKey: "proc:step-001",
      stepId: "step-001",
      task: {
        kind: "node",
        title: "Serialize Inline",
        metadata: { foo: "bar" },
      },
      inputs: { hello: "world" },
    });

    expect(taskRef).toBe(`tasks/${EFFECT_ID}/task.json`);
    expect(inputsRef).toBeUndefined();
    expect(serialized.schemaVersion).toBe(TASK_SCHEMA_VERSION);
    expect(serialized.inputs).toEqual({ hello: "world" });

    const onDisk = JSON.parse(await fs.readFile(path.join(runDir, taskRef), "utf8"));
    expect(onDisk.effectId).toBe(EFFECT_ID);
    expect(onDisk.schemaVersion).toBe(TASK_SCHEMA_VERSION);
    expect(onDisk.inputs).toEqual({ hello: "world" });
  });

  it("spills large inputs to blobs and returns refs", async () => {
    const bigPayload = { data: "x".repeat(1024 * 1024 + 512) };
    const { inputsRef, serialized } = await serializeAndWriteTaskDefinition({
      runDir,
      effectId: EFFECT_ID,
      taskId: "blobbed-input-task",
      invocationKey: "proc:step-002",
      stepId: "step-002",
      task: { kind: "breakpoint" },
      inputs: bigPayload,
    });

    expect(serialized.inputs).toBeUndefined();
    expect(inputsRef).toMatch(/tasks\/01HQA4SERIALZR\/blobs\/inputs-[0-9a-f]+\.json$/);
    const absoluteRef = path.join(runDir, inputsRef!);
    const blob = JSON.parse(await fs.readFile(absoluteRef, "utf8"));
    expect(blob).toEqual(bigPayload);
  });

  it("preserves browser payloads in serialized task definitions", async () => {
    const { taskRef, serialized } = await serializeAndWriteTaskDefinition({
      runDir,
      effectId: EFFECT_ID,
      taskId: "browser-task",
      invocationKey: "proc:step-003",
      stepId: "step-003",
      task: {
        kind: "browser",
        title: "Browser prompt",
        browser: {
          prompt: "Navigate to status page and summarize incidents",
          runtime: "auto",
          sessionMode: "run",
          provider: "openai",
          model: "computer-use-preview",
          output: "json",
          args: ["--headless"],
        },
      },
    });

    expect(serialized.browser).toEqual({
      prompt: "Navigate to status page and summarize incidents",
      runtime: "auto",
      sessionMode: "run",
      provider: "openai",
      model: "computer-use-preview",
      output: "json",
      args: ["--headless"],
    });

    const onDisk = JSON.parse(await fs.readFile(path.join(runDir, taskRef), "utf8"));
    expect(onDisk.kind).toBe("browser");
    expect(onDisk.browser).toEqual(serialized.browser);
  });

  it("serializes task results, spilling large payloads and emitting stdout/stderr refs", async () => {
    const hugeResult = { payload: "z".repeat(1024 * 1024 + 256) };
    const { resultRef, stdoutRef, stderrRef, serialized } = await serializeAndWriteTaskResult({
      runDir,
      effectId: EFFECT_ID,
      taskId: "result-task",
      invocationKey: "proc:step-003",
      payload: {
        status: "ok",
        result: hugeResult,
        stdout: "hello stdout",
        stderr: "hello stderr",
      },
    });

    expect(resultRef).toBe(`tasks/${EFFECT_ID}/result.json`);
    expect(stdoutRef).toBe(`tasks/${EFFECT_ID}/stdout.log`);
    expect(stderrRef).toBe(`tasks/${EFFECT_ID}/stderr.log`);

    const serializedResult = JSON.parse(await fs.readFile(path.join(runDir, resultRef), "utf8"));
    expect(serializedResult.schemaVersion).toBe(RESULT_SCHEMA_VERSION);
    expect(serializedResult.result).toBeUndefined();
    expect(serializedResult.resultRef).toMatch(/blobs\/result-[0-9a-f]+\.json$/);

    const blobContents = JSON.parse(await fs.readFile(path.join(runDir, serializedResult.resultRef), "utf8"));
    expect(blobContents).toEqual(hugeResult);
  });
});
