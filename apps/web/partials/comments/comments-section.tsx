'use client';

import { useEffect, useRef, useState } from 'react';

import { COMMENT_FILTERS } from '~/core/constants';

import { ChevronDownSmall } from '~/design-system/icons/chevron-down-small';

const mockComments = [
  {
    id: '1',
    author: 'Alice',
    photoUrl:
      'https://images.unsplash.com/flagged/photo-1570612861542-284f4c12e75f?fm=jpg&q=60&w=3000&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8OHx8cGVyc29ufGVufDB8fDB8fHww',
    content:
      'The Joe Rogan Experience succeeds largely due to its unstructured format and Rogan’s ability to make guests feel comfortable enough to open up. The quality varies depending on the guest, but the show stands out for giving people hours to explain their views without interruption. That freedom leads to both fascinating insights and occasionally questionable tangents, but it’s part of what makes the podcast unique in the current media landscape.',
    timestamp: '2025-12-12 12:00',
    rate: 100,
    replies: [
      {
        id: '2',
        author: 'Bob',
        rate: 100,
        photoUrl:
          'https://images.unsplash.com/flagged/photo-1570612861542-284f4c12e75f?fm=jpg&q=60&w=3000&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8OHx8cGVyc29ufGVufDB8fDB8fHww',
        content: 'Dahlia as someone who visits LA often, this song is the city. It’s gritty, beautiful, and broken.',
        timestamp: '2025-12-12 12:05',
        replies: [
          {
            id: '3',
            author: 'Bob',
            rate: 100,
            photoUrl:
              'https://images.unsplash.com/flagged/photo-1570612861542-284f4c12e75f?fm=jpg&q=60&w=3000&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8OHx8cGVyc29ufGVufDB8fDB8fHww',
            content:
              'Dahlia as someone who visits LA often, this song is the city. It’s gritty, beautiful, and broken.',
            timestamp: '2025-12-12 12:05',
          },
        ],
      },
    ],
  },
  {
    id: '11',
    author: 'John',
    photoUrl:
      'https://img.freepik.com/free-photo/lifestyle-beauty-fashion-people-emotions-concept-young-asian-female-office-manager-ceo-with-pleased-expression-standing-white-background-smiling-with-arms-crossed-chest_1258-59329.jpg?semt=ais_hybrid&w=740&q=80',
    content:
      'Joe Rogan’s podcast is great when he brings on experts; the long-form conversations can be surprisingly insightful.',
    timestamp: '2025-12-12 13:00',
    rate: 100,
    replies: [
      {
        id: '4',
        author: 'Tommy',
        rate: 100,
        photoUrl:
          'https://img.freepik.com/free-photo/lifestyle-beauty-fashion-people-emotions-concept-young-asian-female-office-manager-ceo-with-pleased-expression-standing-white-background-smiling-with-arms-crossed-chest_1258-59329.jpg?semt=ais_hybrid&w=740&q=80',
        content: 'Reply to John',
        timestamp: '2025-12-12 13:05',
        replies: [
          {
            id: '7',
            author: 'Bob',
            rate: 100,
            photoUrl:
              'https://images.unsplash.com/flagged/photo-1570612861542-284f4c12e75f?fm=jpg&q=60&w=3000&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8OHx8cGVyc29ufGVufDB8fDB8fHww',
            content:
              'Dahlia as someone who visits LA often, this song is the city. It’s gritty, beautiful, and broken.',
            timestamp: '2025-12-12 12:05',
          },
          {
            id: '8',
            author: 'Bob',
            rate: 100,
            photoUrl:
              'https://images.unsplash.com/flagged/photo-1570612861542-284f4c12e75f?fm=jpg&q=60&w=3000&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8OHx8cGVyc29ufGVufDB8fDB8fHww',
            content:
              'Dahlia as someone who visits LA often, this song is the city. It’s gritty, beautiful, and broken.',
            timestamp: '2025-12-12 12:05',
          },
        ],
      },
      {
        id: '24',
        author: 'Tommy',
        rate: 100,
        photoUrl:
          'https://img.freepik.com/free-photo/lifestyle-beauty-fashion-people-emotions-concept-young-asian-female-office-manager-ceo-with-pleased-expression-standing-white-background-smiling-with-arms-crossed-chest_1258-59329.jpg?semt=ais_hybrid&w=740&q=80',
        content: 'Reply to John',
        timestamp: '2025-12-12 13:05',
        replies: [
          {
            id: '26',
            author: 'Bob',
            rate: 100,
            photoUrl:
              'https://images.unsplash.com/flagged/photo-1570612861542-284f4c12e75f?fm=jpg&q=60&w=3000&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8OHx8cGVyc29ufGVufDB8fDB8fHww',
            content:
              'Dahlia as someone who visits LA often, this song is the city. It’s gritty, beautiful, and broken.',
            timestamp: '2025-12-12 12:05',
            replies: [
              {
                id: '29',
                author: 'Bob',
                rate: 100,
                photoUrl:
                  'https://images.unsplash.com/flagged/photo-1570612861542-284f4c12e75f?fm=jpg&q=60&w=3000&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8OHx8cGVyc29ufGVufDB8fDB8fHww',
                content:
                  'Dahlia as someone who visits LA often, this song is the city. It’s gritty, beautiful, and broken.',
                timestamp: '2025-12-12 12:05',
              },
            ],
          },
        ],
      },
    ],
  },
];

export function CommentSection({ commentAmounts }: { commentAmounts: number }) {
  return (
    <div className="flex w-full flex-col">
      <ShadowHeader />
      <SectionTitle commentAmounts={commentAmounts} />
      <CommentInput commentAmounts={commentAmounts} />
      {commentAmounts > 0 && <CommentFilters />}
      <CommentList />
    </div>
  );
}

function ShadowHeader() {
  return (
    <div className="relative h-[56px] w-full overflow-hidden border-t border-t-[#EDEEF3] ">
      <div className="absolute bottom-12 h-[63px] w-full rounded-[100%] bg-[#F6F2F5] blur-[24px]"></div>
    </div>
  );
}

function CommentItem({
  photoUrl,
  content,
  author,
  rate,
  replies,
  index,
  isLast,
  isLastAndFirst,
}: {
  photoUrl: string;
  content: string;
  author: string;
  rate: number;
  replies: any;
  index: number;
  isLast?: boolean;
  isLastAndFirst?: boolean;
}) {
  return (
    <div className={`${index > 0 ? `ml-[36px] pt-[32px]` : 'overflow-y-hidden'} relative flex flex-col pb-5`}>
      {!isLast && !isLastAndFirst ? (
        <div className="absolute  -left-[20px] top-0  h-[100%] w-[1px] border-b border-l border-grey-02"></div>
      ) : null}

      {index > 0 ? (
        <div className="absolute -left-[20px] top-0  h-[50px] w-[20px] rounded-bl-[14px] border-b border-l border-grey-02"></div>
      ) : null}
      <CommentHeader photoUrl={photoUrl} author={author} />
      <div className="relative ml-11 flex flex-col gap-3 pt-[2px]">
        {(!isLast && replies?.length > 0) || (isLast && replies?.length === 1) ? (
          <div className="absolute  -left-[28px] top-0  h-[100%] w-[1px] border-b border-l border-grey-02"></div>
        ) : null}
        <span className="text-[16px] font-normal leading-5 text-[#35363A]">{content}</span>
        <CommentFooter rate={rate} />
      </div>
      {replies?.length > 0 ? (
        <>
          {replies.map((reply: any, indexOrder: number) => {
            return (
              <CommentItem
                key={`${reply.id}-${index}`}
                photoUrl={reply.photoUrl}
                content={reply.content}
                author={reply.author}
                rate={reply.rate}
                replies={reply.replies}
                index={index + 1}
                isLast={indexOrder === replies?.length - 1}
                isLastAndFirst={replies.length === 1}
              />
            );
          })}
        </>
      ) : null}
    </div>
  );
}

function CommentHeader({ photoUrl, author }: { photoUrl: string; author: string }) {
  return (
    <div className="z-100 flex h-8 items-center">
      <img className="aspect-square h-full rounded-full object-cover" src={photoUrl} />
      <span className=" pl-3 text-[13px] font-medium leading-[13px] text-[#35363A]">{author}</span>
      {/* I cannot copy svg from figma so it's just placeholder for now */}
      <div className="ml-[6px] h-[14px] w-[14px] rounded-sm bg-[#D6D6E1]"></div>
      <span className="ml-2 text-[13px] font-normal leading-[13px] text-grey-04">2 hour</span>
    </div>
  );
}

function CommentFooter({ rate }: { rate: number }) {
  return (
    <div className="flex items-center gap-6">
      <div className="flex items-center gap-[10px]">
        {/* I cannot copy svg from figma so it's just placeholder for now */}
        <div className="h-3 w-3 rounded-xs border border-[#B6B6B6]"></div>
        <span className="text-[16px] font-medium text-[#2A2B2E]">{rate}</span>
        {/* I cannot copy svg from figma so it's just placeholder for now */}
        <div className="h-3 w-3 rounded-xs border border-[#000000] bg-[#000000]"></div>
      </div>
      <button className="text-[16px] font-normal text-grey-04">Reply</button>
      <button className="text-[16px] font-normal text-grey-04">Edit</button>
    </div>
  );
}

function CommentList() {
  return (
    <>
      {mockComments.map(comment => {
        return (
          <CommentItem
            key={comment.id}
            photoUrl={comment.photoUrl}
            content={comment.content}
            author={comment.author}
            rate={comment.rate}
            replies={comment.replies}
            index={0}
          />
        );
      })}
    </>
  );
}

function CommentInput({ commentAmounts }: { commentAmounts: number }) {
  return (
    <input
      className="mb-[31px] h-11 w-full rounded-lg border border-grey-02 p-3 placeholder:text-[#95979C] focus:outline-none"
      placeholder={`${commentAmounts > 0 ? 'Join' : 'Start'} the discussion...`}
    />
  );
}

function CommentFilters() {
  return (
    <div className="mb-5 flex h-[26px] w-full gap-2">
      {COMMENT_FILTERS.map(filter => {
        return <FilterSelect key={filter.title} title={filter.title} options={filter.options} />;
      })}
    </div>
  );
}

function FilterSelect({ title, options }: { title: string; options: string[] }) {
  const [opened, setOpened] = useState(false);
  const [activeOption, setActiveOption] = useState(title);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpened(false);
      }
    }

    if (opened) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [opened]);

  return (
    <div ref={containerRef} className="relative h-full items-center">
      <button
        onClick={() => setOpened(prev => !prev)}
        className={`${opened ? 'border-[#35363A]' : 'border-[#DBDBDB]'} flex items-center gap-[6px] rounded border  px-[7px] py-[5px] text-[16px] font-normal leading-[13px] text-[#35363A]`}
      >
        {activeOption}
        <div className={`${opened ? 'rotate-180' : 'rotate-0'} transition-all duration-500  ease-in-out`}>
          <ChevronDownSmall />
        </div>
      </button>
      {opened && (
        <div className="absolute left-0 top-7 z-[200] flex w-[141px] flex-col gap-1 rounded-lg border border-[#DBDBDB] bg-white p-1 shadow-[0px_4px_25px_0px_rgba(0,0,0,0.25)]">
          {options.map(option => {
            return (
              <button
                onClick={() => {
                  setActiveOption(option);
                  setOpened(false);
                }}
                className="h-[35px] w-full rounded-md px-3 text-[16px] font-medium text-[#35363A] hover:bg-[#EDEEF3]"
              >
                {option}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SectionTitle({ commentAmounts }: { commentAmounts: number }) {
  return (
    <span className="pb-4 text-[24px] font-semibold leading-[29px] text-[#2A2B2E]">
      Comments <span className="text-grey-04">({commentAmounts})</span>
    </span>
  );
}
