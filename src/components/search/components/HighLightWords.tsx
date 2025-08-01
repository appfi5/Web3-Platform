import { type FC } from 'react';

import { trunkLongStr } from '~/utils/utility';

const HighLightWords: FC<{ words: string; searchWords: string; trunk: boolean }> = ({ words, searchWords, trunk }) => {
  const lowcaseWords = words.toLowerCase();
  const lowcaseSearchWords = searchWords.toLowerCase();
  const start = lowcaseWords.indexOf(lowcaseSearchWords);

  if (start === -1) return trunk ? trunkLongStr(words) : words;

  if (trunk) {
    return <div className="text-primary">{trunkLongStr(words)}</div>;
  }

  return (
    <div>
      <span>{words.slice(0, start)}</span>
      <span className="text-primary">{words.slice(start, start + searchWords.length)}</span>
      <span>{words.slice(start + searchWords.length)}</span>
    </div>
  );
};

export default HighLightWords;
