import React from 'react';

import { cn } from '~/lib/utils';

import ArrowUp from '../icon/arrow-up.svg';

const KeyboardShortcutsTutorial = () => {
  return (
    <div
      className={cn(
        'w-full p-3 rounded-xl flex flex-wrap justify-between gap-4 whitespace-nowrap text-secondary bg-card-content text-[13px]',
        '[&>div]:flex [&>div]:items-center [&>div]:gap-1',
        '[&_kbd]:text-primary',
      )}
    >
      <div>
        <kbd className="w-5 h-5 leading-5 text-center text-lg rounded border">⌘</kbd>
        <kbd className="w-5 h-5 leading-5 text-center rounded border">K</kbd>
        Open Search
      </div>
      <div>
        <kbd className="w-5 h-5 leading-5 text-center rounded border flex items-center justify-center">
          <ArrowUp className="w-2" />
        </kbd>
        <kbd className="w-5 h-5 leading-5 text-center rounded border flex items-center justify-center">
          <ArrowUp className="rotate-180 w-2" />
        </kbd>
        Navigate
      </div>
      <div>
        <kbd className="w-5 h-5 leading-5 text-center rounded border text-[7px] font-semibold">ESC</kbd>
        Close
      </div>
      <div>
        <kbd className="h-5 leading-5 text-center rounded border text-[7px] font-semibold">Enter</kbd>
        Confirm
      </div>
    </div>
  );
};

export default KeyboardShortcutsTutorial;
