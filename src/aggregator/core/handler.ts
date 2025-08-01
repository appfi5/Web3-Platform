import * as R from 'remeda';
import { concatMap, forkJoin, from, lastValueFrom } from 'rxjs';

export type HandlerFactory<CP, CS, CR> = {
  createSubHandler<RP>(handler: SubHandler<CP, CS, CR, RP>): typeof handler;
};

type CombinedHandler<CP, CS, CR, RP extends Record<string, unknown> = Record<string, unknown>> = {
  prepare(ctx: CP): PromiseLike<RP>;
  save(ctx: CS & { preparedData: RP }): PromiseLike<unknown>;
  rollback(ctx: CR & { preparedData: RP }): PromiseLike<unknown>;
};

export type SubHandler<PrepareCtx, SaveCtx, RollbackCtx, PreparedData> = {
  name: string;
  prepare?(ctx: PrepareCtx): PromiseLike<PreparedData>;
  save?(ctx: SaveCtx & { preparedData: PreparedData }): PromiseLike<unknown>;
  rollback?(ctx: RollbackCtx & { preparedData: PreparedData }): PromiseLike<unknown>;
};

export type BatchSubHandler<PrepareCtx, SaveCtx, RollbackCtx, PreparedData> = {
  name: string;
  prepare?(ctx: PrepareCtx): PromiseLike<PreparedData>;
  save?(ctx: SaveCtx & { preparedData: PreparedData }): PromiseLike<unknown>;
  saveBatch?(ctx: SaveCtx & { preparedDatum: PreparedData[] }): PromiseLike<unknown>;
  rollback?(ctx: RollbackCtx & { preparedData: PreparedData }): PromiseLike<unknown>;
};

export type UnknownSubHandler = SubHandler<unknown, unknown, unknown, unknown>;
type HandlerLifecycle = 'prepare' | 'save' | 'rollback';
type NamedHandle<T extends HandlerLifecycle> = {
  name: string;
  handle: NonNullable<UnknownSubHandler[T]>;
};

export function createHandlerFactory<CP, CS, CR>(): HandlerFactory<CP, CS, CR> {
  return {
    createSubHandler: (handler) => {
      return handler;
    },
  };
}

export function combineSubHandlers<CP, CS, CR>(
  handlers: Array<SubHandler<CP, CS, CR, unknown>>,
): CombinedHandler<CP, CS, CR> {
  // avoid duplicated handlers
  R.pipe(
    handlers,
    R.groupBy(R.prop('name')),
    R.forEachObj((value, key) => {
      if (value.length > 1) {
        throw new Error(`Duplicated handler ${key} found`);
      }
    }),
  );

  const handleChain = <K extends HandlerLifecycle>(handlers: Array<UnknownSubHandler>, lifecycle: K) =>
    handlers.reduce(
      (chain, handler) => {
        const handle = handler[lifecycle]?.bind(handler);
        if (!handle) {
          return chain;
        }
        return chain.concat({ name: handler.name, handle });
      },
      [] as Array<NamedHandle<K>>,
    );

  const prepareChain = handleChain(handlers, 'prepare');
  const saveChain = handleChain(handlers, 'save');
  const rollbackChain = handleChain([...handlers].reverse(), 'rollback');

  return {
    prepare: (ctx) => lastValueFrom(forkJoin(R.mapToObj(prepareChain, ({ name, handle }) => [name, handle(ctx)]))),
    save: (ctx) =>
      lastValueFrom(
        from(saveChain).pipe(concatMap(({ name, handle }) => handle({ ...ctx, preparedData: ctx.preparedData[name] }))),
      ),
    rollback: (ctx) =>
      lastValueFrom(
        from(rollbackChain).pipe(
          concatMap(({ name, handle }) => handle({ ...ctx, preparedData: ctx.preparedData[name] })),
        ),
      ),
  };
}
