import Markdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';

import privacyPolicyContent from './Platform.Privacy.Policy.md';

export default function PrivacyPolicy() {
  return (
    <div className="h-auto md:h-[calc(100vh-200px)] mx-[-44px] px-[44px] py-[24px] overflow-y-auto bg-[#101214] rounded-[16px]">
      <Markdown
        components={{
          h1: ({ children }) => <h1 className="text-[24px] font-bold leading-[200%]">{children}</h1>,
          h2: ({ children }) => <h2 className="text-[14px] font-medium leading-[200%]">{children}</h2>,
          h3: ({ children }) => <h3 className="text-[14px] font-medium leading-[200%]">{children}</h3>,
          h4: ({ children }) => <h4 className="text-[14px] font-medium leading-[200%]">{children}</h4>,
          h5: ({ children }) => <h5 className="text-[14px] font-medium leading-[200%]">{children}</h5>,
          p: ({ children }) => <p className="text-[14px] leading-[200%] mb-4 text-secondary">{children}</p>,
          ul: ({ children }) => (
            <ul className="list-disc text-[14px] text-secondary leading-[200%] list-inside mb-4">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal text-[14px] text-secondary leading-[200%] list-inside mb-4">{children}</ol>
          ),
        }}
        rehypePlugins={[rehypeRaw, rehypeSanitize]}
        remarkPlugins={[remarkGfm]}
      >
        {privacyPolicyContent}
      </Markdown>
    </div>
  );
}
