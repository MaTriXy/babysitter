import { describe, expect, test } from "vitest";
import {
  createProcessContext,
  getActiveProcessContext,
  requireProcessContext,
  withProcessContext,
} from "../processContext";
import { ReplayCursor } from "../replay/replayCursor";
import { EffectIndex } from "../replay/effectIndex";
import {
  EffectPendingError,
  EffectRequestedError,
  MissingProcessContextError,
  ParallelPendingError,
} from "../exceptions";
import { EffectAction, TaskDef } from "../types";
import { buildParallelBatch } from "../../tasks/batching";

function effectIndexStub(): EffectIndex {
  return {} as EffectIndex;
}

const sampleTaskDef: TaskDef = {
  kind: "node",
  title: "demo",
};

function makeAction(id: string): EffectAction {
  return {
    effectId: `01EFF${id}`,
    invocationKey: `proc:S00000${id}:task-${id}`,
    kind: "node",
    label: `task-${id}`,
    labels: [`task-${id}`, "shared"],
    stepId: `S00000${id}`,
    taskId: `task-${id}`,
    taskDefRef: `tasks/01EFF${id}/task.json`,
    inputsRef: `tasks/01EFF${id}/inputs.json`,
    requestedAt: "2026-01-01T00:00:00Z",
    taskDef: sampleTaskDef,
  };
}

const delay = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));

describe("ProcessContext ambient helpers", () => {
  test("withProcessContext isolates ALS scopes across concurrent runs", async () => {
    const { internalContext: ctxA } = createProcessContext({
      runId: "run-1",
      runDir: "/tmp/run-1",
      processId: "proc-1",
      effectIndex: effectIndexStub(),
      replayCursor: new ReplayCursor(),
    });
    const { internalContext: ctxB } = createProcessContext({
      runId: "run-2",
      runDir: "/tmp/run-2",
      processId: "proc-2",
      effectIndex: effectIndexStub(),
      replayCursor: new ReplayCursor(),
    });

    await Promise.all([
      withProcessContext(ctxA, async () => {
        expect(requireProcessContext().processId).toBe("proc-1");
        await new Promise((resolve) => setTimeout(resolve, 5));
        expect(requireProcessContext().processId).toBe("proc-1");
      }),
      withProcessContext(ctxB, async () => {
        expect(requireProcessContext().processId).toBe("proc-2");
      }),
    ]);

    expect(getActiveProcessContext()).toBeUndefined();
  });

  test("cleans up ambient context even when the scoped function throws", async () => {
    const { internalContext } = createProcessContext({
      runId: "run-error",
      runDir: "/tmp/run-error",
      processId: "proc-error",
      effectIndex: effectIndexStub(),
      replayCursor: new ReplayCursor(),
    });

    await expect(
      withProcessContext(internalContext, async () => {
        expect(requireProcessContext().processId).toBe("proc-error");
        throw new Error("boom");
      })
    ).rejects.toThrow("boom");

    expect(getActiveProcessContext()).toBeUndefined();
  });

  test("requireProcessContext throws when no scope is active", () => {
    expect(() => requireProcessContext()).toThrow(MissingProcessContextError);
  });

  test("restores the previous context after nested scopes complete", async () => {
    const { internalContext: outer } = createProcessContext({
      runId: "run-outer",
      runDir: "/tmp/run-outer",
      processId: "proc-outer",
      effectIndex: effectIndexStub(),
      replayCursor: new ReplayCursor(),
    });
    const { internalContext: inner } = createProcessContext({
      runId: "run-inner",
      runDir: "/tmp/run-inner",
      processId: "proc-inner",
      effectIndex: effectIndexStub(),
      replayCursor: new ReplayCursor(),
    });

    await withProcessContext(outer, async () => {
      expect(requireProcessContext().processId).toBe("proc-outer");
      await withProcessContext(inner, async () => {
        expect(requireProcessContext().processId).toBe("proc-inner");
      });
      expect(requireProcessContext().processId).toBe("proc-outer");
    });

    expect(getActiveProcessContext()).toBeUndefined();
  });

  test("maintains isolation across awaited microtasks", async () => {
    const { internalContext } = createProcessContext({
      runId: "run-micro",
      runDir: "/tmp/run-micro",
      processId: "proc-micro",
      effectIndex: effectIndexStub(),
      replayCursor: new ReplayCursor(),
    });

    await withProcessContext(internalContext, async () => {
      await Promise.all([
        (async () => {
          await delay(1);
          expect(requireProcessContext().processId).toBe("proc-micro");
        })(),
        (async () => {
          await delay(2);
          expect(requireProcessContext().processId).toBe("proc-micro");
        })(),
      ]);
    });

    expect(getActiveProcessContext()).toBeUndefined();
  });

  test("getActiveProcessContext returns undefined outside ALS scopes", () => {
    expect(getActiveProcessContext()).toBeUndefined();
  });
});

describe("ProcessContext parallel helpers", () => {
  test("ctx.log is always callable (no-op when no logger configured)", () => {
    const { context, internalContext } = createProcessContext({
      runId: "run-log",
      runDir: "/tmp/run-log",
      processId: "proc-log",
      effectIndex: effectIndexStub(),
      replayCursor: new ReplayCursor(),
    });
    expect(typeof context.log).toBe("function");
    expect(() => context.log?.("hello")).not.toThrow();
    expect(internalContext.logger).toBeUndefined();
  });

  test("non-function logger inputs are ignored to avoid runtime TypeError", () => {
    const { context, internalContext } = createProcessContext({
      runId: "run-bad-log",
      runDir: "/tmp/run-bad-log",
      processId: "proc-bad-log",
      effectIndex: effectIndexStub(),
      replayCursor: new ReplayCursor(),
      logger: "not-a-function" as any,
    });
    expect(typeof context.log).toBe("function");
    expect(() => context.log?.("hello")).not.toThrow();
    expect(internalContext.logger).toBeUndefined();
  });

  test("ctx.parallel.all aggregates pending actions into ParallelPendingError", async () => {
    const { context } = createProcessContext({
      runId: "run-parallel",
      runDir: "/tmp/run-parallel",
      processId: "proc-parallel",
      effectIndex: effectIndexStub(),
      replayCursor: new ReplayCursor(),
    });
    const actionA = makeAction("A");
    const actionB = makeAction("B");
    const actionC = makeAction("C");

    await expect(
      context.parallel.all([
        async () => {
          throw new EffectRequestedError(actionA);
        },
        async () => 42,
        async () => {
          throw new EffectPendingError(actionB);
        },
        async () => {
          throw new ParallelPendingError(buildParallelBatch([actionC, actionB]));
        },
      ])
    ).rejects.toSatisfy((error) => {
      expect(error).toBeInstanceOf(ParallelPendingError);
      const parallelError = error as ParallelPendingError;
      expect(parallelError.batch.actions).toEqual([actionA, actionB, actionC]);
      expect(parallelError.batch.summaries[0]).toMatchObject({
        effectId: actionA.effectId,
        labels: actionA.labels,
        taskDefRef: actionA.taskDefRef,
        inputsRef: actionA.inputsRef,
      });
      return true;
    });
  });

  test("ctx.parallel.map aggregates pending actions and deduplicates effects", async () => {
    const { context } = createProcessContext({
      runId: "run-map-pending",
      runDir: "/tmp/run-map-pending",
      processId: "proc-map-pending",
      effectIndex: effectIndexStub(),
      replayCursor: new ReplayCursor(),
    });
    const actionA = makeAction("1");
    const actionB = makeAction("2");

    await expect(
      context.parallel.map(["first", "second", "third"], async (label) => {
        if (label === "first") throw new EffectRequestedError(actionA);
        if (label === "second") throw new EffectPendingError(actionB);
        return label;
      })
    ).rejects.toSatisfy((error) => {
      expect(error).toBeInstanceOf(ParallelPendingError);
      const parallelError = error as ParallelPendingError;
      expect(parallelError.batch.actions).toEqual([actionA, actionB]);
      expect(parallelError.details).toMatchObject({
        payload: { effects: parallelError.batch.summaries },
      });
      return true;
    });
  });

  test("ctx.parallel.map resolves values when no pending actions remain", async () => {
    const { context } = createProcessContext({
      runId: "run-map",
      runDir: "/tmp/run-map",
      processId: "proc-map",
      effectIndex: effectIndexStub(),
      replayCursor: new ReplayCursor(),
    });

    const values = await context.parallel.map([1, 2, 3], async (value) => {
      await delay(1);
      return value * 2;
    });

    expect(values).toEqual([2, 4, 6]);
  });
});
