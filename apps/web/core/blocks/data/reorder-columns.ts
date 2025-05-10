import { SystemIds, Relation as R } from '@graphprotocol/grc-20';
import { DB } from '~/core/database/write';
import { Relation } from '~/core/types';

// Ensure TypeScript recognizes this as a module
export { };

export type ColumnRelation = {
  relationId: string;
  index?: string;
  [key: string]: any;
};

/**
 * Reorders column relations and updates their indices in the database
 * This is similar to reorderRelations but specific to column ordering
 */
export function reorderColumns<T extends ColumnRelation>(
  reorderedItems: T[],
  spaceId: string
): void {
  if (!reorderedItems.length) {
    return;
  }

  console.log('Reordering columns:', reorderedItems);
  
  // Step 1: Get all current indices
  const relationIndices: Record<string, string> = {};
  reorderedItems.forEach(item => {
    if (item.index) {
      relationIndices[item.relationId] = item.index;
    }
  });
  
  // Step 2: Check for duplicate indices
  const indices = Object.values(relationIndices);
  const hasDuplicateIndices = indices.length > 0 && 
    indices.some((index, i, arr) => arr.indexOf(index) !== i);
  
  // Step 3a: Handle duplicate indices by creating new indices for all items
  if (hasDuplicateIndices || indices.length === 0) {
    // Create new indices for each item sequentially
    const tempIndices: Record<string, string> = {};
    
    try {
      // Get a new index for the first item
      const firstItemOrdering = R.reorder({
        relationId: reorderedItems[0].relationId,
        beforeIndex: undefined,
        afterIndex: undefined,
      });
      
      // Store this first index
      tempIndices[reorderedItems[0].relationId] = firstItemOrdering.triple.value.value;
      
      // Update the database
      DB.upsert({
        entityId: reorderedItems[0].relationId,
        attributeId: SystemIds.RELATION_INDEX,
        attributeName: 'Index',
        entityName: null,
        value: firstItemOrdering.triple.value,
      }, spaceId);
      
      // Process the rest of the items in sequence
      for (let i = 1; i < reorderedItems.length; i++) {
        const currentItem = reorderedItems[i];
        const previousItem = reorderedItems[i - 1];
        
        // Use R.reorder with the previous item's index as the beforeIndex
        const currentOrdering = R.reorder({
          relationId: currentItem.relationId,
          beforeIndex: tempIndices[previousItem.relationId],
          afterIndex: undefined,
        });
        
        // Update the database
        DB.upsert({
          entityId: currentItem.relationId,
          attributeId: SystemIds.RELATION_INDEX,
          attributeName: 'Index',
          entityName: null,
          value: currentOrdering.triple.value,
        }, spaceId);
        
        // Store this new index
        tempIndices[currentItem.relationId] = currentOrdering.triple.value.value;
      }
    } catch (error) {
      console.error('Error fixing duplicate indices:', error);
    }
  }
  // Step 3b: When indices are already unique, update based on new order
  else {
    // First, detect if the order has changed at all
    const originalOrder = [...reorderedItems].sort((a, b) => {
      const indexA = relationIndices[a.relationId] || '';
      const indexB = relationIndices[b.relationId] || '';
      return indexA.localeCompare(indexB, undefined, { numeric: true });
    });

    // Compare original order with new order to see if anything changed
    const hasOrderChanged = originalOrder.some((item, index) =>
      item.relationId !== reorderedItems[index].relationId
    );

    // Only process updates if the order has actually changed
    if (hasOrderChanged) {
      // Update each item based on its new position
      reorderedItems.forEach((item, arrayIndex) => {
        const beforeItem = arrayIndex > 0 ? reorderedItems[arrayIndex - 1] : undefined;
        const afterItem = arrayIndex < reorderedItems.length - 1 ? reorderedItems[arrayIndex + 1] : undefined;

        const beforeIndex = beforeItem ? relationIndices[beforeItem.relationId] : undefined;
        const afterIndex = afterItem ? relationIndices[afterItem.relationId] : undefined;
        const currentIndex = relationIndices[item.relationId];

        // Check if this item needs updating based on its new position
        const hasCurrentIndex = !!currentIndex;
        const isOutOfOrderWithBefore = beforeIndex && currentIndex && beforeIndex > currentIndex;
        const isOutOfOrderWithAfter = afterIndex && currentIndex && currentIndex > afterIndex;
        const hasDuplicateNeighborIndices = beforeIndex === afterIndex && beforeIndex !== undefined;
        const needsUpdate = !hasCurrentIndex || isOutOfOrderWithBefore || isOutOfOrderWithAfter || hasDuplicateNeighborIndices;

        // Skip if no update is needed
        if (!needsUpdate) {
          return;
        }
      
      try {
        const newTripleOrdering = R.reorder({
          relationId: item.relationId,
          beforeIndex: beforeIndex,
          afterIndex: afterIndex,
        });
        
        DB.upsert({
          entityId: item.relationId,
          attributeId: SystemIds.RELATION_INDEX,
          attributeName: 'Index',
          entityName: null,
          value: newTripleOrdering.triple.value,
        }, spaceId);
      } catch (error) {
        console.error('Error reordering column:', error);
      }
    });
  }
}

/**
 * Sorts relations by their index property
 * This can be used as a replacement for useRelationshipIndices
 * when you don't need real-time sorting
 */
export function sortColumnsByIndex<T extends ColumnRelation>(
  columns: T[]
): T[] {
  if (!columns.length) {
    return columns;
  }

  // First make a copy to avoid mutating the original
  const sortableColumns = [...columns];

  // Check if we have any columns with indices
  const hasAnyIndices = sortableColumns.some(col => !!col.index);

  // If no columns have indices, return them in original order
  // This preserves the natural order when no indices are available
  if (!hasAnyIndices) {
    return sortableColumns;
  }

  // Sort columns with indices, preserving relative positioning
  return sortableColumns.sort((a, b) => {
    const indexA = a.index || '';
    const indexB = b.index || '';

    // If both have indices, sort by them
    if (indexA && indexB) {
      return indexA.localeCompare(indexB, undefined, { numeric: true });
    }

    // If only one has index, put the one with index first
    if (indexA && !indexB) return -1;
    if (!indexA && indexB) return 1;

    // Default to id sorting for consistent order
    return a.relationId.localeCompare(b.relationId);
  });
}