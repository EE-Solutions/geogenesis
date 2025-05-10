import { SystemIds } from '@graphprotocol/grc-20';
import { sortByIndex, reorderItems, OrderableItem } from '~/core/utils/relation-ordering';
import { debounce } from '~/utils/debounce';

// Define our column relation type that extends OrderableItem
export type ColumnRelation = OrderableItem & {
  relationId: string;
  index?: string;
  [key: string]: any;
};

// Create a debounced version of reorderItems
const debouncedReorderItems = debounce(
  (
    items: Array<{ relationId: string; index?: string; [key: string]: any }>,
    itemSpaceId: string,
    attributeId: string = SystemIds.RELATION_INDEX,
    attributeName: string = 'Index'
  ) => {
    console.log('Debounced reorderItems called from reorderColumns with', items.length, 'items');
    reorderItems(items, itemSpaceId, attributeId, attributeName);
  },
  100 // 100ms debounce time
);

/**
 * Reorders column relations and updates their indices in the database
 * This is a wrapper around the shared reorderItems utility with debouncing
 */
export function reorderColumns<T extends ColumnRelation>(
  reorderedItems: T[],
  spaceId: string
): void {
  if (!reorderedItems || !reorderedItems.length) return;

  // Use the debounced version of our shared utility function
  console.log('Reordering columns using debounced utility with', reorderedItems.length, 'items');
  debouncedReorderItems(reorderedItems, spaceId, SystemIds.RELATION_INDEX, 'Index');
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