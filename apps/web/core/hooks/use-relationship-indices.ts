import { SystemIds, Relation as R } from '@graphprotocol/grc-20';
import { useQueryEntities } from '~/core/sync/use-store';
import { DB } from '~/core/database/write';
import { useEffect, useState } from 'react';

type RelationEntity = {
  relationId: string;
  [key: string]: any;
};

type UseRelationshipIndicesOptions = {
  spaceId: string;
};

type UseRelationshipIndicesReturn<T extends RelationEntity> = {
  sortedItems: T[];
  reorderItems: (reorderedItems: T[]) => void;
  isLoading: boolean;
};

/**
 * A hook for managing relationship indices. 
 * Handles loading, sorting, and reordering relationships based on their indices.
 * 
 * @param items Array of relation entities that have a relationId property
 * @param options Configuration options
 * @returns Object with sorted items, reorder function, and loading state
 */
export function useRelationshipIndices<T extends RelationEntity>(
  items: T[],
  options: UseRelationshipIndicesOptions
): UseRelationshipIndicesReturn<T> {
  const { spaceId } = options;
  
  const [relationItems, setRelationItems] = useState<T[]>(items);
  const [relationIndices, setRelationIndices] = useState<Record<string, string>>({});
  
  const { entities: collectionItems, isLoading } = useQueryEntities({
    enabled: items.length > 0,
    where: {
      id: {
        in: items.map(r => r.relationId),
      },
    },
  });

  // Update items when input changes
  useEffect(() => {
    setRelationItems(items);
  }, [items]);

  // Load and sort items by their indices
  useEffect(() => {
    if (!isLoading && collectionItems) {
      // Create an object mapping relation IDs to their index values
      const indicesMap: Record<string, string> = {};
      
      collectionItems.forEach((entity) => {
        const indexTriple = entity.triples.find(t => t.attributeId === SystemIds.RELATION_INDEX);
        if (indexTriple && indexTriple.value && indexTriple.value.value) {
          indicesMap[entity.id] = indexTriple.value.value;
        }
      });

      setRelationIndices(indicesMap);
      
      // Sort relationItems by their string index values
      const sortedRelationItems = [...relationItems].sort((a, b) => {
        const indexA = indicesMap[a.relationId] || '';
        const indexB = indicesMap[b.relationId] || '';
        
        // String comparison - this will properly sort lexicographically
        return indexA.localeCompare(indexB, undefined, { numeric: true });
      });
      
      // Only update if the order has changed
      if (JSON.stringify(sortedRelationItems.map(item => item.relationId)) !== 
          JSON.stringify(relationItems.map(item => item.relationId))) {
        setRelationItems(sortedRelationItems);
      }
    }
  }, [collectionItems, isLoading, relationItems]);

  /**
   * Reorder relation items and update their indices
   */
  const reorderItems = (reorderedItems: T[]) => {
    setRelationItems(reorderedItems);
    
    // Check if there are any duplicate indices that need to be fixed
    const indices = Object.values(relationIndices);
    const hasDuplicateIndices = indices.length > 0 && indices.some((index, i, arr) => 
      arr.indexOf(index) !== i
    );
    
    // First pass: if we have duplicate indices, we need to fix them first
    if (hasDuplicateIndices) {
      // Create new indices for each item sequentially
      const tempIndices: Record<string, string> = {};
      
      // First item gets a starting index using R.reorder
      if (reorderedItems.length > 0) {
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
            
            // Store this new index
            tempIndices[currentItem.relationId] = currentOrdering.triple.value.value;
            
            // Update the database
            DB.upsert({
              entityId: currentItem.relationId,
              attributeId: SystemIds.RELATION_INDEX,
              attributeName: 'Index',
              entityName: null,
              value: currentOrdering.triple.value,
            }, spaceId);
          }
          
          // Update our local state with all the new indices
          setRelationIndices(tempIndices);
        } catch (error) {
          console.error('Error fixing duplicate indices:', error);
        }
      }
    }
    // Regular reordering process when indices are already unique
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
          
          setRelationIndices(prev => ({
            ...prev,
            [item.relationId]: newTripleOrdering.triple.value.value
          }));
        } catch (error) {
          console.error('Error reordering relation:', error);
        }
      });
    }
  };

  return {
    sortedItems: relationItems,
    reorderItems,
    isLoading
  };
}
