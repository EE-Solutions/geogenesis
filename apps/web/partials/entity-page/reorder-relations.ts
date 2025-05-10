import { SystemIds, Relation as R } from '@graphprotocol/grc-20';
import { DB } from '~/core/database/write';

type RelationItem = {
  relationId: string;
  index?: string;
  [key: string]: any;
};

/**
 * Reorders relation items and updates their indices in the database
 */
export function reorderRelations<T extends RelationItem>(
  reorderedItems: T[],
  spaceId: string
): void {
  if (!reorderedItems.length) {
    return;
  }

  console.log('Reordering relations:', reorderedItems);
  
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
  // Step 3b: When indices are already unique, only update what's needed
  else {
    reorderedItems.forEach((item, arrayIndex) => {
      const beforeItem = arrayIndex > 0 ? reorderedItems[arrayIndex - 1] : undefined;
      const afterItem = arrayIndex < reorderedItems.length - 1 ? reorderedItems[arrayIndex + 1] : undefined;
      
      const beforeIndex = beforeItem ? relationIndices[beforeItem.relationId] : undefined;
      const afterIndex = afterItem ? relationIndices[afterItem.relationId] : undefined;
      const currentIndex = relationIndices[item.relationId];
      
      // Only update if the item's index is out of order relative to its neighbors
      const needsUpdate = 
        (beforeIndex && currentIndex && beforeIndex > currentIndex) || 
        (afterIndex && currentIndex && currentIndex > afterIndex) ||
        (beforeIndex === afterIndex && beforeIndex !== undefined);
        
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
        
        // Update the index locally
        relationIndices[item.relationId] = newTripleOrdering.triple.value.value;
      } catch (error) {
        console.error('Error reordering relation:', error);
      }
    });
  }
}