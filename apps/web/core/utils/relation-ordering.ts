import { SystemIds, Relation as R } from '@graphprotocol/grc-20';
import { DB } from '~/core/database/write';

/**
 * Common interface for items that can be ordered using index
 */
export interface OrderableItem {
  id?: string;         // Entity ID
  relationId?: string; // Relation ID (required for reordering)
  index?: string;      // The index value used for ordering
  [key: string]: any;  // Additional properties
}

/**
 * Sorts items by their index property
 * This is a generic utility that can be used for any items with an index property
 * 
 * @param items Array of items with optional index properties
 * @returns Sorted array of items
 */
export function sortByIndex<T extends OrderableItem>(items: T[]): T[] {
  if (!items.length) {
    return items;
  }
  
  // Make a copy to avoid mutating the original array
  const sortableItems = [...items];
  
  // Check if we have any items with indices
  const hasAnyIndices = sortableItems.some(item => !!item.index);
  
  // If no items have indices, return them in original order
  // This preserves the natural order when no indices are available
  if (!hasAnyIndices) {
    return sortableItems;
  }
  
  // Track original position for stable sorting
  const itemsWithPosition = sortableItems.map((item, originalIndex) => ({
    item,
    originalIndex
  }));

  // Sort items with indices, preserving relative positioning
  const sortedItems = itemsWithPosition
    .sort((a, b) => {
      const itemA = a.item;
      const itemB = b.item;

      const indexA = itemA.index || '';
      const indexB = itemB.index || '';

      // If both have indices, sort by them
      if (indexA && indexB) {
        const compareResult = indexA.localeCompare(indexB, undefined, { numeric: true });
        // If indices are equal, maintain original order for stability
        return compareResult !== 0 ? compareResult : a.originalIndex - b.originalIndex;
      }

      // If only one has index, put the one with index first
      if (indexA && !indexB) return -1;
      if (!indexA && indexB) return 1;

      // Default to id sorting for consistent order
      const idA = itemA.relationId || itemA.id || '';
      const idB = itemB.relationId || itemB.id || '';

      // If both have ids, sort by them
      if (idA && idB) {
        const compareResult = idA.localeCompare(idB);
        // If ids are equal, maintain original order for stability
        return compareResult !== 0 ? compareResult : a.originalIndex - b.originalIndex;
      }

      // Maintain original order when ids are missing
      return a.originalIndex - b.originalIndex;
    })
    .map(wrapper => wrapper.item);

  return sortedItems;
}

/**
 * Reorders items and updates their indices in the database
 * 
 * @param items Array of items with relationId and optional index properties
 * @param spaceId The space ID where the relations exist
 * @param attributeId Optional attribute ID for the index (defaults to RELATION_INDEX)
 * @param attributeName Optional attribute name (defaults to "Index")
 */
export function reorderItems<T extends OrderableItem>(
  items: T[],
  spaceId: string,
  attributeId: string = SystemIds.RELATION_INDEX,
  attributeName: string = 'Index'
): void {
  if (!items.length) {
    return;
  }

  console.log(`Reordering ${items.length} items in space ${spaceId}`);
  console.log('reorder Items:', items);
  
  // Step 1: Get all current indices
  const itemIndices: Record<string, string> = {};
  items.forEach(item => {
    const id = item.relationId || item.id;
    if (id && item.index) {
      itemIndices[id] = item.index;
    }
  });
  
  // Step 2: Check for issues with indices
  const indices = Object.values(itemIndices);
  const hasDuplicateIndices = indices.length > 0 &&
    indices.some((index, i, arr) => arr.indexOf(index) !== i);

  // Check if all items have valid IDs and indices
  const hasMissingIds = items.some(item => !(item.relationId || item.id));
  const hasMissingIndices = indices.length < items.length;
  
  // Step 3a: Handle problematic indices by creating new indices for all items
  if (hasDuplicateIndices || hasMissingIndices || hasMissingIds || indices.length === 0) {
    // Create new indices for each item sequentially
    const tempIndices: Record<string, string> = {};
    
    try {
      // Get a new index for the first item
      const firstItem = items[0];
      const firstItemId = firstItem.relationId || firstItem.id;
      
      if (!firstItemId) {
        console.error('First item has no relationId or id', firstItem);
        return;
      }
      
      const firstItemOrdering = R.reorder({
        relationId: firstItemId,
        beforeIndex: undefined,
        afterIndex: undefined,
      });
      
      // Store this first index
      tempIndices[firstItemId] = firstItemOrdering.triple.value.value;
      
      // Update the database
      DB.upsert({
        entityId: firstItemId,
        attributeId,
        attributeName,
        entityName: null,
        value: firstItemOrdering.triple.value,
      }, spaceId);
      
      // Process the rest of the items in sequence
      for (let i = 1; i < items.length; i++) {
        const currentItem = items[i];
        const previousItem = items[i - 1];
        
        const currentItemId = currentItem.relationId || currentItem.id;
        const previousItemId = previousItem.relationId || previousItem.id;
        
        if (!currentItemId || !previousItemId) {
          console.error('Item missing id', currentItem, previousItem);
          continue;
        }
        
        // Use R.reorder with the previous item's index as the beforeIndex
        const currentOrdering = R.reorder({
          relationId: currentItemId,
          beforeIndex: tempIndices[previousItemId],
          afterIndex: undefined,
        });
        
        // Update the database
        DB.upsert({
          entityId: currentItemId,
          attributeId,
          attributeName,
          entityName: null,
          value: currentOrdering.triple.value,
        }, spaceId);
        
        // Store this new index
        tempIndices[currentItemId] = currentOrdering.triple.value.value;
      }
    } catch (error) {
      console.error('Error fixing duplicate indices:', error);
    }
  }
  // Step 3b: When indices are already unique, update based on new order
  else {
    // First, detect if the order has changed at all
    const originalOrder = sortByIndex(items);
    
    // Compare original order with new order to see if anything changed
    const hasOrderChanged = originalOrder.some((item, index) => {
      const originalId = item.relationId || item.id;
      const newId = items[index].relationId || items[index].id;
      return originalId !== newId;
    });
    
    // Only process updates if the order has actually changed
    if (hasOrderChanged) {
      items.forEach((item, arrayIndex) => {
        const itemId = item.relationId || item.id;
        if (!itemId) {
          console.error('Item missing id', item);
          return;
        }
        
        const beforeItem = arrayIndex > 0 ? items[arrayIndex - 1] : undefined;
        const afterItem = arrayIndex < items.length - 1 ? items[arrayIndex + 1] : undefined;
        
        const beforeId = beforeItem && (beforeItem.relationId || beforeItem.id);
        const afterId = afterItem && (afterItem.relationId || afterItem.id);
        
        const beforeIndex = beforeId ? itemIndices[beforeId] : undefined;
        const afterIndex = afterId ? itemIndices[afterId] : undefined;
        const currentIndex = itemIndices[itemId];
        
        // Check if this item needs updating based on its new position
        const hasCurrentIndex = !!currentIndex;
        const isOutOfOrderWithBefore = beforeIndex && currentIndex && beforeIndex > currentIndex;
        const isOutOfOrderWithAfter = afterIndex && currentIndex && currentIndex > afterIndex;
        const hasDuplicateNeighborIndices = beforeIndex === afterIndex && beforeIndex !== undefined;
        const needsUpdate = !hasCurrentIndex || isOutOfOrderWithBefore || isOutOfOrderWithAfter || hasDuplicateNeighborIndices;
        
        // Skip if no update is needed
        if (!needsUpdate) {
          console.log('No update needed for item', itemId);
          return;
        }
        
        try {
          const newTripleOrdering = R.reorder({
            relationId: itemId,
            beforeIndex: beforeIndex,
            afterIndex: afterIndex,
          });
          
          DB.upsert({
            entityId: itemId,
            attributeId,
            attributeName,
            entityName: null,
            value: newTripleOrdering.triple.value,
          }, spaceId);
        } catch (error) {
          console.error('Error reordering item:', error);
        }
      });
    } else {
      console.log('No changes detected in order, skipping update');
    }
  }
}

/**
 * A specialized version of reorderItems for relations
 * This is a convenience function for backward compatibility
 */
export function reorderRelations<T extends OrderableItem>(
  relations: T[],
  spaceId: string
): void {
  reorderItems(relations, spaceId, SystemIds.RELATION_INDEX, 'Index');
}

/**
 * A specialized version of sortByIndex for relations
 * This is a convenience function for backward compatibility
 */
export function sortRelationsByIndex<T extends OrderableItem>(
  relations: T[]
): T[] {
  return sortByIndex(relations);
}