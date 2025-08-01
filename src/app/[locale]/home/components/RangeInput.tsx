import { type ChangeEvent, useEffect, useState } from 'react';

import { Input } from '~/components/ui/input';

export default function RangeInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string[];
  onChange: (val: string[]) => void;
}) {
  const [min, setMin] = useState('');
  const [max, setMax] = useState('');

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    let { value } = e.target;
    const charReg = /[^\d.]/g;
    if (charReg.test(value)) {
      value = value.replace(charReg, '');
    }
    if (e.target.dataset.type === 'min') {
      onChange([value, max]);
    } else {
      onChange([min, value]);
    }
  };

  useEffect(() => {
    setMin(value[0] || '');
    setMax(value[1] || '');
  }, [value]);

  return (
    <div className="pt-4">
      {label ? <p className="text-[14px] font-medium">{label}</p> : null}
      <div className="flex items-center gap-2 mt-2">
        <Input className="w-[138px] h-[29px]" data-type="min" onChange={handleChange} value={min} />
        <div className="w-2 h-[1px] bg-input" />
        <Input className="w-[138px] h-[29px]" data-type="max" onChange={handleChange} value={max} />
      </div>
    </div>
  );
}
