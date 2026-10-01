import { Effect } from 'effect';
import { Kind, type OperationDefinitionNode, parse, print } from 'graphql';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const requests = vi.hoisted(() => [] as { query: unknown; variables: Record<string, unknown> }[]);
const respond = vi.hoisted(() => ({
  fn: (_variables: Record<string, unknown>): unknown => ({}),
}));
vi.mock('./graphql-client', () => ({
  graphql: ({
    query,
    variables,
    decoder,
  }: {
    query: unknown;
    variables: Record<string, unknown>;
    decoder: (data: unknown) => unknown;
  }) =>
    Effect.suspend(() => {
      requests.push({ query, variables });
      const data = respond.fn(variables);
      return data instanceof Error ? Effect.fail(data) : Effect.sync(() => decoder(data));
    }),
}));

const { batchDocument, createAliasBatcher } = await import('./alias-batcher');

const DOCUMENT = parse(`
  query Count($id: UUID!, $kind: Int!) {
    count(id: $id, kind: $kind) { ...Total }
  }
  fragment Total on Count { total }
`);

// Answers a batched request field by field, and a single request directly.
function answer(totalFor: (id: string) => number | Error) {
  respond.fn = variables => {
    const ids = Object.entries(variables).filter(([key]) => key.startsWith('id'));
    if ('id' in variables) {
      const total = totalFor(variables.id as string);
      return total instanceof Error ? total : { count: { total } };
    }
    if (ids.some(([, id]) => totalFor(id as string) instanceof Error)) return new Error('batch failed');
    return Object.fromEntries(ids.map(([key, id]) => [`i${key.slice(3)}_count`, { total: totalFor(id as string) }]));
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  requests.length = 0;
});
afterEach(() => {
  vi.useRealTimers();
});

describe('batchDocument', () => {
  it('suffixes each item’s variables, aliases its root fields and keeps fragments', () => {
    const batched = batchDocument(DOCUMENT, 2);
    const operation = batched.definitions[0] as OperationDefinitionNode;
    expect(operation.name?.value).toBe('CountBatch');
    expect(operation.variableDefinitions?.map(v => v.variable.name.value)).toEqual([
      'id_0',
      'kind_0',
      'id_1',
      'kind_1',
    ]);
    const text = print(batched);
    expect(text).toContain('i0_count: count(id: $id_0, kind: $kind_0)');
    expect(text).toContain('i1_count: count(id: $id_1, kind: $kind_1)');
    expect(batched.definitions.filter(d => d.kind === Kind.FRAGMENT_DEFINITION)).toHaveLength(1);
  });
});

describe('createAliasBatcher', () => {
  const load = () => createAliasBatcher(DOCUMENT as never, (data: { count: { total: number } }) => data.count.total);

  it('sends reads made within the window as one request, each caller getting its own result', async () => {
    answer(id => Number(id.slice(1)));
    const read = load();
    const results = Promise.all(['a1', 'a2', 'a3'].map(id => Effect.runPromise(read({ id, kind: 0 } as never))));
    await vi.advanceTimersByTimeAsync(20);
    await expect(results).resolves.toEqual([1, 2, 3]);
    expect(requests).toHaveLength(1);
  });

  it('asks once for identical reads', async () => {
    answer(() => 7);
    const read = load();
    const results = Promise.all([0, 1, 2].map(() => Effect.runPromise(read({ id: 'a1', kind: 0 } as never))));
    await vi.advanceTimersByTimeAsync(20);
    await expect(results).resolves.toEqual([7, 7, 7]);
    expect(requests).toHaveLength(1);
    expect(requests[0].variables).toEqual({ id: 'a1', kind: 0 });
  });

  it('falls back to one request per item when the batch fails, so only the bad item fails', async () => {
    answer(id => (id === 'bad' ? new Error('nope') : 5));
    const read = load();
    const good = Effect.runPromise(read({ id: 'a5', kind: 0 } as never));
    const bad = Effect.runPromise(read({ id: 'bad', kind: 0 } as never)).catch(e => e);
    await vi.advanceTimersByTimeAsync(20);
    await expect(good).resolves.toBe(5);
    expect(await bad).toBeInstanceOf(Error);
    expect(requests).toHaveLength(3);
  });

  it('rejects an aborted caller alone', async () => {
    answer(() => 1);
    const read = load();
    const controller = new AbortController();
    const aborted = Effect.runPromise(read({ id: 'a1', kind: 0 } as never, controller.signal)).catch(e => e);
    const other = Effect.runPromise(read({ id: 'a2', kind: 0 } as never));
    controller.abort();
    await vi.advanceTimersByTimeAsync(20);
    expect(String((await aborted).name)).toContain('AbortError');
    await expect(other).resolves.toBe(1);
  });
});
