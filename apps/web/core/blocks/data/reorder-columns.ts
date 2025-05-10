import { SystemIds } from '@graphprotocol/grc-20';
import { Relation } from '~/core/types';
import { sortByIndex, reorderItems, OrderableItem } from '~/core/utils/relation-ordering';

// Define our column relation type that extends OrderableItem
export type ColumnRelation = OrderableItem & {
  relationId: string;
  index?: string;
  [key: string]: any;
};

/**
 * Reorders column relations and updates their indices in the database
 * This is a wrapper around the shared reorderItems utility
 */
export function reorderColumns<T extends ColumnRelation>(
  reorderedItems: T[],
  spaceId: string
): void {
  // Forward to the shared utility function
  reorderItems(reorderedItems, spaceId, SystemIds.RELATION_INDEX, 'Index');
}

/**
 * Sorts columns by their index property
 * This is a wrapper around the shared sortByIndex utility
 */
export function sortColumnsByIndex<T extends ColumnRelation>(
  columns: T[]
): T[] {
  // Forward to the shared utility function
  return sortByIndex(columns);
}