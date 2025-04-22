import { SystemIds, Relation as R } from '@graphprotocol/grc-20';
import { useQueryEntities } from '~/core/sync/use-store';
import { DB } from '~/core/database/write';
import { useEffect, useState, useRef, useMemo } from 'react';

type RelationEntity = {
  relationId: string;
  index?: string;
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

  // Store the original items in a ref to avoid dependency issues
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // Create indices map from collection items
  const indicesMap = useMemo(() => {
    if (!collectionItems) return {};
    
    const map: Record<string, string> = {};
    collectionItems.forEach((entity) => {
      const indexTriple = entity.triples.find(t => t.attributeId === SystemIds.RELATION_INDEX);
      if (indexTriple?.value?.value) {
        map[entity.id] = indexTriple.value.value;
      }
    });
    
    return map;
  }, [collectionItems]);
  
  // Calculate sorted items based on indices map and original items
  const sortedItems = useMemo(() => {
    // Only recalculate when items or indices change
    const currentItems = itemsRef.current;
    
    if (!currentItems.length || Object.keys(indicesMap).length === 0) {
      return currentItems;
    }

    // Create a new sorted array with index values attached
    const result = [...currentItems].sort((a, b) => {
      const indexA = indicesMap[a.relationId] || '';
      const indexB = indicesMap[b.relationId] || '';
      return indexA.localeCompare(indexB, undefined, { numeric: true });
    });
    
    // Add index values to sorted items
    result.forEach(item => {
      const indexValue = indicesMap[item.relationId];
      if (indexValue) {
        item.index = indexValue;
      }
    });
    
    return result;
  }, [indicesMap]); // Remove items from dependency array to prevent infinite loops

  // Update state once when sorted items are calculated
  useEffect(() => {
    // Only update if we have data and it's different from current state
    if (sortedItems.length > 0) {
      setRelationItems(sortedItems);
      
      // Also update the indices record for reorderItems to use
      setRelationIndices(indicesMap);
    }
  }, [sortedItems, indicesMap]);


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

  // Use the calculated sorted items directly instead of the state
  // to avoid rendering loops
  return {
    sortedItems: sortedItems.length > 0 ? sortedItems : relationItems,
    reorderItems,
    isLoading: isLoading || !collectionItems
  };
}
