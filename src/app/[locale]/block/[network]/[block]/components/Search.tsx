import Image from 'next/image';
import { useState } from 'react';

import { Input } from '~/components/ui/input';

import ClearIcon from './clear.svg';

function Search({ onChange }: { onChange: (val: string) => void }) {
  const [value, setValue] = useState('');
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter') {
      onChange(value);
    }
  };

  return (
    <div className="relative" onKeyDown={handleKeyDown}>
      <div className="relative w-[120px]">
        <Image alt="search" className="absolute top-[6px] left-3" height={20} src="/img/search.svg" width={20} />
        <Input
          className="pl-[34px] pr-8 rounded-[40px] h-[32px] text-[14px] bg-transparent focus-visible:ring-offset-0"
          onChange={(e) => setValue(e.target.value)}
          value={value}
        />
        {value && (
          <button className="absolute top-[50%] -translate-y-1/2 right-3" onClick={() => setValue('')}>
            <ClearIcon />
          </button>
        )}
      </div>
    </div>
  );
}

export default Search;
