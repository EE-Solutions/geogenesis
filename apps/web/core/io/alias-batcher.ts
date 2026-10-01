import type { TypedDocumentNode } from '@graphql-typed-document-node/core';

import { Effect, Exit } from 'effect';
import * as Cause from 'effect/Cause';
import {
  type DocumentNode,
  type FieldNode,
  Kind,
  type OperationDefinitionNode,
  type VariableDefinitionNode,
  visit,
} from 'graphql';

import { graphql } from './graphql-client';

/** Ids queued within this window go out together. Long enough for staggered card mounts, short enough not to be felt. */
const BATCH_WINDOW_MS = 10;
/** The API answered 100 aliased root fields as fast as one (2026-10-01); 50 keeps responses modest. */
const MAX_BATCH_SIZE = 50;

type Pending<Decoded> = {
  variables: Record<string, unknown>;
  waiters: { resolve: (value: Decoded) => void; reject: (error: unknown) => void; signal?: AbortSignal }[];
};

/**
 * Rewrites a single-item query into one that asks for `count` items at once: each item's variables
 * get a `_<i>` suffix and each root field an `i<i>_` alias. Fragments are kept as they are.
 */
export function batchDocument(document: DocumentNode, count: number): DocumentNode {
  const operation = document.definitions.find(
    (definition): definition is OperationDefinitionNode => definition.kind === Kind.OPERATION_DEFINITION
  );
  if (!operation) throw new Error('batchDocument: no operation');
  const variableDefinitions: VariableDefinitionNode[] = [];
  const selections: FieldNode[] = [];
  for (let i = 0; i < count; i++) {
    const renamed: OperationDefinitionNode = visit(operation, {
      Variable: node => ({ ...node, name: { ...node.name, value: `${node.name.value}_${i}` } }),
    });
    variableDefinitions.push(...(renamed.variableDefinitions ?? []));
    for (const selection of renamed.selectionSet.selections) {
      if (selection.kind !== Kind.FIELD) throw new Error('batchDocument: root selections must be fields');
      selections.push({
        ...selection,
        alias: { kind: Kind.NAME, value: `i${i}_${(selection.alias ?? selection.name).value}` },
      });
    }
  }
  return {
    kind: Kind.DOCUMENT,
    definitions: [
      {
        ...operation,
        name: { kind: Kind.NAME, value: `${operation.name?.value ?? 'Query'}Batch` },
        variableDefinitions,
        selectionSet: { kind: Kind.SELECTION_SET, selections },
      },
      ...document.definitions.filter(definition => definition.kind !== Kind.OPERATION_DEFINITION),
    ],
  };
}

function rootFieldNames(document: DocumentNode) {
  const operation = document.definitions.find(
    (definition): definition is OperationDefinitionNode => definition.kind === Kind.OPERATION_DEFINITION
  );
  return (operation?.selectionSet.selections ?? []).map(selection =>
    selection.kind === Kind.FIELD ? (selection.alias ?? selection.name).value : ''
  );
}

function abortError() {
  return Object.assign(new Error('The operation was aborted'), { name: 'AbortError', isAbort: true });
}

/**
 * Coalesces single-item reads of one query into aliased multi-item requests (GEO-3067).
 *
 * Feed cards and table rows each ask for their own count or relation as they mount, which cost one
 * request per item (e.g. ~90-160 EntityResponseCounts per page). The loader keeps each caller's
 * contract: same variables, same decoded result, its own rejection. Only the browser batches; on the
 * server each call runs as before.
 *
 * A failed batch is retried item by item, so one bad item can't fail its neighbours. A caller that
 * aborts is rejected on its own; the shared request carries on for the rest.
 */
export function createAliasBatcher<TDocument extends TypedDocumentNode<any, any>, Decoded>(
  document: TDocument,
  decoder: (data: TDocument extends TypedDocumentNode<infer R, any> ? R : never) => Decoded
) {
  type Variables = TDocument extends TypedDocumentNode<any, infer V> ? V : never;
  const fields = rootFieldNames(document);
  const documents = new Map<number, DocumentNode>();
  let queued: Map<string, Pending<Decoded>> | null = null;

  const single = (variables: Variables, signal?: AbortSignal) =>
    graphql({ query: document, decoder: decoder as never, variables, signal }) as Effect.Effect<Decoded, unknown>;

  const settle = (pending: Pending<Decoded>, exit: Exit.Exit<Decoded, unknown>) => {
    for (const waiter of pending.waiters) {
      if (waiter.signal?.aborted) continue;
      if (Exit.isSuccess(exit)) waiter.resolve(exit.value);
      else waiter.reject(Cause.squash(exit.cause));
    }
  };

  async function run(chunk: Pending<Decoded>[]) {
    if (chunk.length === 1) {
      settle(chunk[0], await Effect.runPromiseExit(single(chunk[0].variables as Variables)));
      return;
    }
    let batched = documents.get(chunk.length);
    if (!batched) documents.set(chunk.length, (batched = batchDocument(document, chunk.length)));
    const variables: Record<string, unknown> = {};
    chunk.forEach((pending, i) => {
      for (const [key, value] of Object.entries(pending.variables)) variables[`${key}_${i}`] = value;
    });
    const exit = await Effect.runPromiseExit(
      graphql({
        query: batched as TypedDocumentNode<Record<string, unknown>, Record<string, unknown>>,
        decoder: data => data,
        variables,
      })
    );
    if (Exit.isFailure(exit)) {
      // One request per item, as before batching: a bad item fails alone.
      await Promise.all(
        chunk.map(async pending => settle(pending, await Effect.runPromiseExit(single(pending.variables as Variables))))
      );
      return;
    }
    chunk.forEach((pending, i) => {
      const data = Object.fromEntries(fields.map(field => [field, exit.value[`i${i}_${field}`]]));
      let decoded: Exit.Exit<Decoded, unknown>;
      try {
        decoded = Exit.succeed(decoder(data as never));
      } catch (error) {
        decoded = Exit.fail(error);
      }
      settle(pending, decoded);
    });
  }

  function flush() {
    const batch = queued;
    queued = null;
    if (!batch) return;
    const live = [...batch.values()].filter(pending => pending.waiters.some(waiter => !waiter.signal?.aborted));
    for (let start = 0; start < live.length; start += MAX_BATCH_SIZE) {
      void run(live.slice(start, start + MAX_BATCH_SIZE));
    }
  }

  /** The single-item read as an Effect, batched in the browser. */
  return function load(variables: Variables, signal?: AbortSignal): Effect.Effect<Decoded, unknown> {
    if (typeof window === 'undefined') return single(variables, signal);
    return Effect.async<Decoded, unknown>(resume => {
      if (signal?.aborted) return resume(Effect.fail(abortError()));
      const key = JSON.stringify(variables);
      if (!queued) {
        queued = new Map();
        setTimeout(flush, BATCH_WINDOW_MS);
      }
      const pending = queued.get(key) ?? { variables: variables as Record<string, unknown>, waiters: [] };
      queued.set(key, pending);
      const onAbort = () => resume(Effect.fail(abortError()));
      signal?.addEventListener('abort', onAbort, { once: true });
      pending.waiters.push({
        signal,
        resolve: value => {
          signal?.removeEventListener('abort', onAbort);
          resume(Effect.succeed(value));
        },
        reject: error => {
          signal?.removeEventListener('abort', onAbort);
          resume(Effect.fail(error));
        },
      });
    });
  };
}
