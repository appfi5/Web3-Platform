import Image from 'next/image';
import { useEffect, useState } from 'react';

import { Input } from '~/components/ui/input';
import { isValidHash } from '~/utils/validators';

export function Search({ onChange }: { onChange: (val: string) => void }) {
  const [value, setValue] = useState('');

  useEffect(() => {
    if (isValidHash(value) || value === '') {
      onChange(value);
    }
  }, [onChange, value]);

  return (
    <div className="relative w-[100px]">
      <Image alt="search" className="absolute top-[6px] left-3" height={14} src="/img/search.svg" width={20} />
      <Input
        className="pl-[34px] rounded-[40px] h-[32px] text-[14px] bg-transparent focus-visible:ring-offset-0"
        onChange={(e) => setValue(e.target.value)}
        value={value}
      />
    </div>
  );
}
