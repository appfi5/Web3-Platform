/* eslint-disable @typescript-eslint/unbound-method */
import { from, lastValueFrom } from 'rxjs';

import { combineSubHandlers, type UnknownSubHandler } from './handler';

describe('combineSubHandlers', () => {
  const saveOrder: unknown[] = [];
  const rollbackOrder: unknown[] = [];

  const handler1PreparedData = { handler1Prepared: true };
  const sub1: UnknownSubHandler = {
    name: 'handler1',
    prepare: jest.fn(async () => handler1PreparedData),
    save: jest.fn(async () => saveOrder.push('handler1')),
    rollback: jest.fn(async () => rollbackOrder.push('handler1')),
  };

  const handler2PreparedData = { handler2Prepared: true };
  const sub2: UnknownSubHandler = {
    name: 'handler2',
    prepare: jest.fn(async () => handler2PreparedData),
    save: jest.fn(async () => saveOrder.push('handler2')),
    rollback: jest.fn(async () => rollbackOrder.push('handler2')),
  };

  const handler = combineSubHandlers<
    { injectedPrepareContext: boolean },
    { injectedSaveContext: boolean },
    { injectedRollbackContext: boolean }
  >([sub1, sub2]);
  const combinedPreparedData = { handler1: handler1PreparedData, handler2: handler2PreparedData };

  test('prepare', async () => {
    const prepareContext = { injectedPrepareContext: true };
    const preparedData = await lastValueFrom(from(handler.prepare(prepareContext)));

    expect(sub1.prepare).toHaveBeenCalledWith(prepareContext);
    expect(sub2.prepare).toHaveBeenCalledWith(prepareContext);
    expect(preparedData).toEqual(combinedPreparedData);
  });

  test('save', async () => {
    await lastValueFrom(
      from(
        handler.save({
          injectedSaveContext: true,
          preparedData: combinedPreparedData,
        }),
      ),
    );
    expect(saveOrder).toEqual(['handler1', 'handler2']);
    expect(sub1.save).toHaveBeenCalledWith({ injectedSaveContext: true, preparedData: handler1PreparedData });
    expect(sub2.save).toHaveBeenCalledWith({ injectedSaveContext: true, preparedData: handler2PreparedData });
  });

  test('rollback', async () => {
    await lastValueFrom(
      from(
        handler.rollback({
          injectedRollbackContext: true,
          preparedData: combinedPreparedData,
        }),
      ),
    );
    expect(rollbackOrder).toEqual(['handler2', 'handler1']);
    expect(sub1.rollback).toHaveBeenCalledWith({
      injectedRollbackContext: true,
      preparedData: handler1PreparedData,
    });
    expect(sub2.rollback).toHaveBeenCalledWith({
      injectedRollbackContext: true,
      preparedData: handler2PreparedData,
    });
  });
});
