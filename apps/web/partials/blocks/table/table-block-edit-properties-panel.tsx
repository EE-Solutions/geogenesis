import { ContentIds, SystemIds } from '@graphprotocol/grc-20';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { cx } from 'class-variance-authority';
import { pipe } from 'effect';
import { dedupeWith } from 'effect/Array';
import { useAtomValue, useSetAtom } from 'jotai';
import Image from 'next/legacy/image';
import { Reorder } from 'framer-motion';

import * as React from 'react';

import { generateSelector, getIsSelected } from '~/core/blocks/data/data-selectors';
import { useFilters } from '~/core/blocks/data/use-filters';
import { useSource } from '~/core/blocks/data/use-source';
import { useView } from '~/core/blocks/data/use-view';
import { PLACEHOLDER_SPACE_IMAGE } from '~/core/constants';
import { getSchemaFromTypeIds } from '~/core/database/entities';
import { EntityId } from '~/core/io/schema';
import { useQueryEntitiesAsync, useQueryEntityAsync } from '~/core/sync/use-store';
import { RenderableProperty } from '~/core/types';
import { toRenderables } from '~/core/utils/to-renderables';
import { getImagePath } from '~/core/utils/utils';

import { Checkbox } from '~/design-system/checkbox';
import { Dots } from '~/design-system/dots';
import { EntitySmall } from '~/design-system/icons/entity-small';
import { Eye } from '~/design-system/icons/eye';
import { EyeHide } from '~/design-system/icons/eye-hide';
import { LeftArrowLong } from '~/design-system/icons/left-arrow-long';
import { RelationSmall } from '~/design-system/icons/relation-small';
import { DragHandle } from '~/design-system/icons/drag-handle';
import { MenuItem } from '~/design-system/menu';

import { sortRenderables } from '~/partials/entity-page/entity-page-utils';

import { editingPropertiesAtom } from '~/atoms';

type Column = {
  id: string;
  name: string | null;
};

export function TableBlockEditPropertiesPanel() {
  const { source } = useSource();
  const isEditingProperties = useAtomValue(editingPropertiesAtom);

  if (!isEditingProperties) {
    return null;
  }

  return source.type === 'RELATIONS' ? <RelationsPropertySelector /> : <DefaultPropertySelector />;
}

function RelationsPropertySelector() {
  const { source } = useSource();
  const { filterState } = useFilters();
  const findOne = useQueryEntityAsync();

  const [selectedEntities, setSelectedEntities] = React.useState<{
    type: 'TO' | 'FROM' | 'SOURCE';
    entityIds: EntityId[];
  } | null>(null);
  const setIsEditingProperties = useSetAtom(editingPropertiesAtom);

  const { data: sourceEntity } = useQuery({
    queryKey: ['entity-for-merging', source],
    queryFn: async () => {
      if (source.type !== 'RELATIONS') {
        return null;
      }

      return await findOne(source.value);
    },
  });

  if (sourceEntity === null || sourceEntity === undefined || source.type !== 'RELATIONS') {
    return null;
  }

  // @TODO: This should be stored as a data structure somewhere
  const filteredPropertyId = filterState.find(r => r.columnId === SystemIds.RELATION_TYPE_ATTRIBUTE)?.value;
  const relationIds = sourceEntity.relationsOut.filter(r => r.typeOf.id === filteredPropertyId).map(r => r.id);
  const toIds = sourceEntity.relationsOut.filter(r => r.typeOf.id === filteredPropertyId).map(r => r.toEntity.id);

  const maybeSourceEntityImage = sourceEntity.relationsOut.find(
    r => r.typeOf.id === EntityId(ContentIds.AVATAR_ATTRIBUTE)
  )?.toEntity.value;

  const onBack = () => {
    if (selectedEntities && selectedEntities.entityIds.length > 0) {
      setSelectedEntities(null);
    } else {
      setIsEditingProperties(false);
    }
  };

  return (
    <>
      <MenuItem className="border-b border-grey-02">
        <button onClick={onBack} className="flex w-full items-center gap-2 text-smallButton">
          <LeftArrowLong />
          <span>Back</span>
        </button>
      </MenuItem>
      {selectedEntities ? (
        <PropertySelector where={selectedEntities.type} entityIds={selectedEntities.entityIds} />
      ) : (
        <div className="w-full py-1">
          <MenuItem onClick={() => setSelectedEntities({ type: 'FROM', entityIds: [sourceEntity.id] })}>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <div className="relative h-4 w-4 overflow-hidden rounded">
                  <Image
                    src={maybeSourceEntityImage ? getImagePath(maybeSourceEntityImage) : PLACEHOLDER_SPACE_IMAGE}
                    layout="fill"
                  />
                </div>
                {/* <span className="text-footnoteMedium text-grey-04">0 selected</span> */}
              </div>
              <p className="text-button">{sourceEntity.name}</p>
            </div>
          </MenuItem>

          <MenuItem onClick={() => setSelectedEntities({ type: 'SOURCE', entityIds: relationIds })}>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <div className="flex h-4 w-4 items-center justify-center rounded bg-grey-04">
                  <RelationSmall color="white" />
                </div>
                {/* <span className="text-footnoteMedium text-grey-04">0 selected</span> */}
              </div>
              <p className="text-button">Relation entity</p>
            </div>
          </MenuItem>
          <MenuItem onClick={() => setSelectedEntities({ type: 'TO', entityIds: toIds })}>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <div className="flex h-4 w-4 items-center justify-center rounded bg-grey-04">
                  <EntitySmall color="white" />
                </div>
                {/* <span className="text-footnoteMedium text-grey-04">0 selected</span> */}
              </div>
              <p className="text-button">To</p>
            </div>
          </MenuItem>
        </div>
      )}
    </>
  );
}

function DefaultPropertySelector() {
  const { filterState } = useFilters();
  const { source } = useSource();
  const {
    spaceId,
    shownColumnIds,
    // shownColumnRelations already comes sorted by index from useView
    shownColumnRelations,
    // reorderShownColumns uses the new reorderColumns utility from useView
    reorderShownColumns
  } = useView();

  const setIsEditingProperties = useSetAtom(editingPropertiesAtom);

  const { data: availableColumns, isLoading: isLoadingColumns } = useQuery({
    queryKey: ['available-columns', filterState],
    queryFn: async () => {
      const schema = await getSchemaFromTypeIds(
        filterState.filter(f => f.columnId === SystemIds.TYPES_ATTRIBUTE).map(f => f.value)
      );

      return schema;
    },
  });

  // Collect the relations that are already shown in the table
  const visibleRelations = React.useMemo(() => {
    // Create a map of entity IDs to their relations for quick lookup
    const entityIdToRelationMap = new Map();

    // Build the map from shownColumnRelations which is already sorted by index
    shownColumnRelations.forEach(relation => {
      if (relation.toEntity && relation.toEntity.id) {
        entityIdToRelationMap.set(relation.toEntity.id.toString(), relation);
      }
    });

    return entityIdToRelationMap;
  }, [shownColumnRelations]);

  // Create a combined list of columns with display status
  const combinedColumns = React.useMemo(() => {
    if (!availableColumns) return [];

    // Filter out the name column (index 0) from available columns
    const filteredColumns = availableColumns
      .filter((column, index) => index !== 0)
      .map(column => {
        // Get the relation for this column from our map (if it exists)
        const relationForColumn = visibleRelations.get(column.id);

        return {
          ...column,
          // If the column has a relation, use that relation's ID as the dragKey
          // Otherwise, use a placeholder ID that won't match any relation
          dragKey: relationForColumn ? relationForColumn.id : `placeholder-${column.id}`,
          // Include the original relation if it exists (needed for reordering)
          relation: relationForColumn,
          // Mark as shown if it's in shownColumnIds
          isShown: shownColumnIds.includes(column.id)
        };
      });

    return filteredColumns;
  }, [availableColumns, shownColumnIds, visibleRelations]);

  // Create a precisely ordered list of columns that exactly matches the database order
  const orderedColumns = React.useMemo(() => {
    if (combinedColumns.length === 0) return [];

    // Step 1: Start with columns that have relations (in the exact order they appear in shownColumnRelations)
    const shownColumnsMap = new Map();
    const resultColumns = [];

    // First pass: collect all columns with relations into a map for easy lookup
    combinedColumns.forEach(column => {
      if (column.relation) {
        shownColumnsMap.set(column.relation.id, column);
      }
    });

    // Second pass: add shown columns in the exact order they appear in shownColumnRelations
    shownColumnRelations.forEach(relation => {
      const column = shownColumnsMap.get(relation.id);
      if (column) {
        resultColumns.push(column);
        // Remove from map to mark as processed
        shownColumnsMap.delete(relation.id);
      }
    });

    // Step 2: Add remaining columns that don't have relations
    const remainingColumns = combinedColumns.filter(column => !column.relation);
    resultColumns.push(...remainingColumns);

    return resultColumns;
  }, [combinedColumns, shownColumnRelations]);

  // Custom reorder function for UI and to update relations
  const handleReorder = React.useCallback((newOrder) => {
    // Extract relations that actually exist in the database in their new order
    const relationsToReorder = newOrder
      .filter(item => item.relation)
      .map(item => item.relation);

    // Only update if we actually have relations to reorder
    if (relationsToReorder.length > 0) {
      console.log('Reordering relations in properties panel:',
        relationsToReorder.map(r => ({ id: r.id, toEntityId: r.toEntity?.id }))
      );

      // The reorderShownColumns function will handle updating the indices
      // This will persist the new order to the database
      reorderShownColumns(relationsToReorder);
    }
  }, [reorderShownColumns]);

  const isLoading = isLoadingColumns;

  if (source.type === 'RELATIONS') {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-3">
        <Dots />
      </div>
    );
  }

  return (
    <>
      <MenuItem className="border-b border-grey-02">
        <button
          onClick={() => setIsEditingProperties(false)}
          className="flex w-full items-center gap-2 text-smallButton"
        >
          <LeftArrowLong />
          <span>Back</span>
        </button>
      </MenuItem>
      <div className="px-2 py-1">
        <p className="text-footnote text-grey-04 mb-2">Drag properties to reorder them</p>
      </div>
      <Reorder.Group 
        as="div" 
        axis="y" 
        values={orderedColumns} 
        onReorder={handleReorder}
        className="flex flex-col"
      >
        {orderedColumns.map((column) => (
          <Reorder.Item
            as="div"
            key={column.dragKey}
            value={column}
            className="mb-1 cursor-move"
          >
            <div className="flex items-center px-2">
              {/* Only show drag handle for visible columns with actual relations */}
              {column.isShown && column.relation && (
                <div className="p-1 text-grey-04 hover:text-text mr-1">
                  <DragHandle />
                </div>
              )}
              <div className="flex-1">
                <ToggleColumn column={column} />
              </div>
            </div>
          </Reorder.Item>
        ))}
      </Reorder.Group>
    </>
  );
}

type PropertySelectorProps = {
  entityIds: EntityId[];
  where: 'TO' | 'FROM' | 'SOURCE';
};

/**
 * Select which properties a user wants to render for the data block.
 * The properties are determined based on which properties exist
 * on a given entity.
 *
 * e.g., if an Entity has a Name, Description, and Spouse, then the
 * user can select Name, Description or Spouse.
 */
function PropertySelector({ entityIds, where }: PropertySelectorProps) {
  const findMany = useQueryEntitiesAsync();

  const { toggleProperty: setProperty, mapping } = useView();

  const { data: availableProperties, isLoading } = useQuery({
    queryKey: ['rollup-available-properties', entityIds],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      if (entityIds.length === 0) {
        return [];
      }

      const entities = await findMany({
        where: {
          id: {
            in: entityIds,
          },
        },
      });

      const availableProperties = entities.flatMap(e => {
        return pipe(
          toRenderables({
            entityId: e.id,
            entityName: e.name,
            spaceId: e.spaces[0],
            triples: e.triples,
            relations: e.relationsOut,
          }),
          sortRenderables,
          renderables =>
            renderables
              .map(t => {
                return {
                  id: t.attributeId,
                  name: t.attributeName,
                  renderableType: t.type,
                };
              })
              .filter(t => t.name !== null)
        );
      });

      return dedupeWith(availableProperties, (a, b) => a.id === b.id);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-3">
        <Dots />
      </div>
    );
  }

  if (availableProperties === undefined) {
    return <MenuItem>No available properties</MenuItem>;
  }

  const onSelectProperty = (property: {
    id: string;
    name: string | null;
    renderableType: RenderableProperty['type'];
  }) => {
    const selector = generateSelector(property, where);

    setProperty(
      {
        id: property.id,
        name: property.name,
      },
      selector ?? undefined
    );
  };

  const selectors = [...Object.values(mapping)].filter(s => s !== null);

  return (
    <div>
      {availableProperties.map(p => {
        const isSelected = getIsSelected(selectors, where, p);

        return (
          <MenuItem key={p.id} onClick={() => onSelectProperty(p)}>
            <div className="flex w-full items-center justify-between">
              <span className="text-button text-grey-04">{p.name}</span>
              <Checkbox checked={isSelected} />
            </div>
          </MenuItem>
        );
      })}
    </div>
  );
}

type ToggleColumnProps = {
  column: Column & { 
    isShown?: boolean;
    relation?: any;
    dragKey?: string;
  };
};

function ToggleColumn({ column }: ToggleColumnProps) {
  const { toggleProperty: setColumn, shownColumnIds } = useView();
  const isShown = 'isShown' in column ? column.isShown : shownColumnIds.includes(column.id);

  const onToggleColumn = async () => {
    setColumn(column);
  };

  return (
    <div className="flex w-full items-center justify-between py-2">
      <span className={cx('flex-1', !isShown && 'text-grey-03')}>{column.name}</span>
      <button
        onClick={onToggleColumn}
        className="focus:outline-none"
        aria-label={isShown ? "Hide column" : "Show column"}
      >
        {isShown ? <Eye /> : <EyeHide />}
      </button>
    </div>
  );
}