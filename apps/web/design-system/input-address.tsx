import * as Popover from '@radix-ui/react-popover';
import { cva } from 'class-variance-authority';
import cx from 'classnames';
import { useAtom } from 'jotai';
import pluralize from 'pluralize';

import * as React from 'react';
import { startTransition, useState } from 'react';

import { Feature } from '~/core/hooks/use-place-search';
import { usePlaceSearch } from '~/core/hooks/use-place-search';
import type { RelationValueType } from '~/core/types';
import { getImagePath } from '~/core/utils/utils';

import { Tag } from '~/design-system/tag';
import { Toggle } from '~/design-system/toggle';
import { Tooltip } from '~/design-system/tooltip';

import { ArrowLeft } from './icons/arrow-left';
import { InfoSmall } from './icons/info-small';
import { Search } from './icons/search';
import { TopRanked } from './icons/top-ranked';
import { ResizableContainer } from './resizable-container';
import { Truncate } from './truncate';
import { showingIdsAtom } from '~/atoms';

type SearchPlaceEntityProps = {
  spaceId: string;
  relationValueTypes?: RelationValueType[];
  placeholder?: string;
  containerClassName?: string;
  inputClassName?: string;
  variant?: 'floating' | 'fixed';
  width?: 'clamped' | 'full';
  withSearchIcon?: boolean;
};

const inputStyles = cva('', {
  variants: {
    fixed: {
      true: 'm-0 block w-full resize-none bg-transparent p-0 text-body placeholder:text-grey-03 focus:outline-none focus:placeholder:text-grey-03',
    },
    floating: {
      true: 'm-0 block w-full resize-none bg-transparent p-2 text-body placeholder:text-grey-03 focus:outline-none focus:placeholder:text-grey-03',
    },
    withSearchIcon: {
      true: 'pl-9',
    },
  },
  defaultVariants: {
    fixed: true,
    floating: false,
    withSearchIcon: false,
  },
});

const containerStyles = cva('relative', {
  variants: {
    width: {
      clamped: 'w-[400px]',
      full: 'w-full',
    },
    floating: {
      true: 'rounded-md border border-divider bg-white',
    },
    isQueried: {
      true: 'rounded-b-none',
    },
  },
  defaultVariants: {
    width: 'clamped',
    floating: false,
    isQueried: false,
  },
});

export const InputPlace = ({
  relationValueTypes = [],
  placeholder = 'Find or create...',
  width = 'clamped',
  variant = 'fixed',
  containerClassName = '',
  inputClassName = '',
  withSearchIcon = false,
}: SearchPlaceEntityProps) => {
  const [isShowingIds, setIsShowingIds] = useAtom(showingIdsAtom);
  const [result, setResult] = useState<Feature[] | null>(null);

  const filterByTypes = relationValueTypes.length > 0 ? relationValueTypes.map(r => r.typeId) : undefined;

  const { results, onQueryChange, query, isEmpty, isLoading, resultEntities, isEntitiesLoading } = usePlaceSearch({
    filterByTypes,
  });

  if (query === '' && result !== null) {
    startTransition(() => {
      setResult(null);
    });
  }

  const handleShowIds = () => {
    setIsShowingIds(!isShowingIds);
  };

  //TO DO: add create/import logic

  return (
    <div
      className={containerStyles({
        width,
        floating: variant === 'floating',
        isQueried: query.length > 0,
        className: containerClassName,
      })}
    >
      {withSearchIcon && (
        <div className="absolute bottom-0 left-3 top-0 z-10 flex items-center">
          <Search />
        </div>
      )}
      <Popover.Root open={!!query} onOpenChange={() => onQueryChange('')}>
        <Popover.Anchor asChild>
          <input
            type="text"
            value={query}
            onChange={({ currentTarget: { value } }) => onQueryChange(value)}
            placeholder={placeholder}
            className={inputStyles({ [variant]: true, withSearchIcon, className: inputClassName })}
            spellCheck={false}
          />
        </Popover.Anchor>
        {query && (
          <Popover.Portal forceMount>
            <Popover.Content
              onOpenAutoFocus={event => {
                event.preventDefault();
                event.stopPropagation();
              }}
              className="z-[9999] w-[var(--radix-popper-anchor-width)] leading-none"
              forceMount
            >
              <div className={cx(variant === 'fixed' && 'pt-1', width === 'full' && 'w-full')}>
                <div
                  className={cx(
                    '-ml-px overflow-hidden rounded-lg border border-grey-02 bg-white shadow-lg',
                    width === 'clamped' ? 'w-[400px]' : '-mr-px',
                    withSearchIcon && 'rounded-t-none'
                  )}
                >
                  {!result ? (
                    <ResizableContainer>
                      <div className="no-scrollbar flex max-h-[219px] flex-col overflow-y-auto overflow-x-clip bg-white">
                        {!results?.length && isLoading && isEntitiesLoading && (
                          <div className="w-full bg-white px-3 py-2">
                            <div className="truncate text-resultTitle text-text">Loading...</div>
                          </div>
                        )}
                        {isEmpty ? (
                          <div className="w-full bg-white px-3 py-2">
                            <div className="truncate text-resultTitle text-text">No results.</div>
                          </div>
                        ) : (
                          <div className="divide-y divide-divider bg-white">
                            {resultEntities?.map((resultEn, index) => (
                              <div key={`${index}-entities`} className="w-full">
                                <div className="p-1">
                                  <button className="relative z-10 flex w-full flex-col rounded-md px-3 py-2 transition-colors duration-150 hover:bg-grey-01 focus:bg-grey-01 focus:outline-none">
                                    {isShowingIds && (
                                      <div className="mb-2 text-[0.6875rem] text-grey-04">ID · {resultEn.id}</div>
                                    )}
                                    <div className="max-w-full truncate text-resultTitle text-text">
                                      {resultEn.name}
                                    </div>
                                    <div className="mt-1.5 flex items-center gap-1.5">
                                      <div className="flex shrink-0 items-center gap-1">
                                        <span className="inline-flex size-[12px] items-center justify-center rounded-sm border border-grey-04">
                                          <TopRanked color="grey-04" />
                                        </span>
                                        <span className="text-[0.875rem] text-text">Top-ranked</span>
                                      </div>
                                      {resultEn.types.length > 0 && (
                                        <>
                                          <div className="shrink-0">
                                            <svg
                                              width="8"
                                              height="9"
                                              viewBox="0 0 8 9"
                                              fill="none"
                                              xmlns="http://www.w3.org/2000/svg"
                                            >
                                              <path
                                                d="M2.25 8L5.75 4.5L2.25 1"
                                                stroke="#606060"
                                                strokeLinecap="round"
                                              />
                                            </svg>
                                          </div>
                                          <div className="flex items-center gap-1.5">
                                            {resultEn.types.slice(0, 3).map(type => (
                                              <Tag key={type.id}>{type.name}</Tag>
                                            ))}
                                            {resultEn.types.length > 3 ? (
                                              <Tag>{`+${resultEn.types.length - 3}`}</Tag>
                                            ) : null}
                                          </div>
                                        </>
                                      )}
                                    </div>
                                    {resultEn.description && (
                                      <>
                                        <Truncate maxLines={3} shouldTruncate variant="footnote" className="mt-2">
                                          <p className="!text-[0.75rem] leading-[1.2] text-grey-04">
                                            {resultEn.description}
                                          </p>
                                        </Truncate>
                                      </>
                                    )}
                                  </button>
                                </div>
                                <div className="-mt-2 p-1">
                                  <button className="relative z-0 flex w-full items-center justify-between rounded-md px-3 py-1.5 transition-colors duration-150 hover:bg-grey-01">
                                    <div className="flex items-center gap-1">
                                      <div className="inline-flex gap-0">
                                        {(resultEn.spaces ?? []).slice(0, 3).map(space => (
                                          <div
                                            key={space.spaceId}
                                            className="-ml-[4px] h-3 w-3 overflow-clip rounded-sm border border-white first:ml-0"
                                          >
                                            <img
                                              src={getImagePath(space.image)}
                                              alt=""
                                              className="h-full w-full object-cover"
                                            />
                                          </div>
                                        ))}
                                      </div>
                                      <div className="text-[0.875rem] text-text">
                                        {(resultEn.spaces ?? []).length}{' '}
                                        {pluralize('space', (resultEn.spaces ?? []).length)}
                                      </div>
                                    </div>
                                    <div className="text-[0.875rem] text-grey-04">Select space</div>
                                  </button>
                                </div>
                              </div>
                            ))}
                            {/* Results from mapbox API */}
                            {results.map((result, index) => (
                              <div key={index} className="w-full">
                                <div className="p-1">
                                  <button
                                    onClick={() => {
                                      setResult(null);
                                      //   add create logic
                                      onQueryChange('');
                                    }}
                                    className="relative z-10 flex w-full flex-col rounded-md px-3 py-2 transition-colors duration-150 hover:bg-grey-01 focus:bg-grey-01 focus:outline-none"
                                  >
                                    <div className="flex w-full justify-between">
                                      <div className="max-w-full truncate text-resultTitle text-text">
                                        {result.text}
                                      </div>
                                      {/* Add Import logic */}
                                      <button className="text-[0.875rem] font-normal text-grey-04">Import</button>
                                    </div>

                                    {result.place_name && (
                                      <>
                                        <Truncate maxLines={3} shouldTruncate variant="footnote" className="mt-1">
                                          <p className="!text-[0.875rem] leading-[1.2] text-text">
                                            {result.place_name}
                                          </p>
                                        </Truncate>
                                      </>
                                    )}
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </ResizableContainer>
                  ) : (
                    <>
                      <div className="flex items-center justify-between border-b border-divider bg-white">
                        <div className="w-1/3">
                          <button onClick={() => setResult(null)} className="p-2">
                            <ArrowLeft color="grey-04" />
                          </button>
                        </div>
                        <div className="flex w-1/3 items-center justify-center p-2 text-center text-resultTitle text-text">
                          <span>Select space</span>
                        </div>
                        <div className="flex w-1/3 justify-end px-2">
                          <Tooltip
                            trigger={
                              <div className="*:size-[12px]">
                                <InfoSmall color="grey-04" />
                              </div>
                            }
                            label={`Selecting a specific space will mean that any time anyone clicks this link, it’ll take them to that space’s view of this entity.`}
                            position="top"
                            variant="light"
                          />
                        </div>
                      </div>
                    </>
                  )}
                  {!result && (
                    <div className="flex w-full items-center justify-between border-t border-grey-02 px-4 py-2">
                      <button onClick={handleShowIds} className="inline-flex items-center gap-1.5">
                        <Toggle checked={isShowingIds} />
                        <div className="text-[0.875rem] text-grey-04">IDs</div>
                      </button>
                      <button className="text-resultLink text-ctaHover">Create new</button>
                    </div>
                  )}
                </div>
              </div>
            </Popover.Content>
          </Popover.Portal>
        )}
      </Popover.Root>
    </div>
  );
};
