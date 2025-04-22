import { SystemIds } from '@graphprotocol/grc-20';
import { INITIAL_RELATION_INDEX_VALUE } from '@graphprotocol/grc-20/constants';
import React from 'react';

import { StoreRelation } from '~/core/database/types';
import { DB } from '~/core/database/write';
import { ID } from '~/core/id';
import { Entity } from '~/core/io/dto/entities';
import { EntityId } from '~/core/io/schema';
import { useQueryEntities, useQueryEntity } from '~/core/sync/use-store';
import { Relation } from '~/core/types';
import { getImagePath } from '~/core/utils/utils';
import { useRelationshipIndices } from '~/core/hooks/use-relationship-indices';

import { useDataBlockInstance } from './use-data-block';
import { useMapping } from './use-mapping';

type DataBlockViewDetails = { name: string; id: string; value: DataBlockView };
type Column = {
  id: string;
  name: string | null;
};

export function useView() {
  const { entityId, spaceId, relationId } = useDataBlockInstance();

  const { entity: blockEntity } = useQueryEntity({
    spaceId: spaceId,
    id: entityId,
  });

  const { entity: blockRelation } = useQueryEntity({
    spaceId: spaceId,
    id: relationId,
  });

  const viewRelation = blockRelation?.relationsOut.find(
    relation => relation.typeOf.id === EntityId(SystemIds.VIEW_ATTRIBUTE)
  );

  const shownColumnRelations =
    blockRelation?.relationsOut.filter(
      // We fall back to an old properties used to render shown columns.
      relation =>
        relation.typeOf.id === EntityId(SystemIds.SHOWN_COLUMNS) ||
        relation.typeOf.id === EntityId(SystemIds.PROPERTIES)
    ) ?? [];
  
  // Use the relationship indices hook to sort the shown columns
  const memoizedRelations = React.useMemo(() => shownColumnRelations.map(relation => ({
    ...relation,
    relationId: relation.id
  })), [shownColumnRelations]);

  const { 
    sortedItems: sortedShownColumnRelations, 
    reorderItems: reorderShownColumns,
    isLoading: isLoadingIndices 
  } = useRelationshipIndices(
    // Use memoized relations to prevent creating a new array on each render
    memoizedRelations,
    { spaceId }
  );

  // Disable verbose logging during normal operation
  // if (shownColumnRelations.length > 0) {
  //   console.log('useView shownColumnRelations', shownColumnRelations);
  //   console.log('useView sortedShownColumnRelations', sortedShownColumnRelations);
  // }

  const { mapping, isLoading, isFetched } = useMapping(
    entityId,
    // Use the sorted relations for mapping
    sortedShownColumnRelations.map(r => r.id)
  );

  // Extract the column IDs in the order they appear in sortedShownColumnRelations
  // and add NAME_ATTRIBUTE if it's not already included
  const shownColumnIds = sortedShownColumnRelations
    .map(relation => relation.toEntity.id.toString())
    .filter(id => id in mapping);

  // Add NAME_ATTRIBUTE if it's not already in the list
  if (!shownColumnIds.includes(SystemIds.NAME_ATTRIBUTE)) {
    shownColumnIds.push(SystemIds.NAME_ATTRIBUTE);
  }

  // Disable verbose logging during normal operation
  // console.log('useView sortedShownColumnRelations:', sortedShownColumnRelations.map(r => ({ 
  //   id: r.id, 
  //   toEntityId: r.toEntity.id,
  //   index: r.index
  // })));
  // console.log('useView sortedColumnIds:', shownColumnIds);

  const view = getView(viewRelation);
  const placeholder = getPlaceholder(blockEntity, view);

  const setView = async (newView: DataBlockViewDetails) => {
    const isCurrentView = newView.value === view;

    if (!isCurrentView) {
      if (viewRelation) {
        DB.removeRelation({ relation: viewRelation, spaceId });
      }

      const newRelation: StoreRelation = {
        space: spaceId,
        index: INITIAL_RELATION_INDEX_VALUE,
        typeOf: {
          id: EntityId(SystemIds.VIEW_ATTRIBUTE),
          name: 'View',
        },
        fromEntity: {
          id: EntityId(relationId),
          name: blockEntity?.name ?? null,
        },
        toEntity: {
          id: EntityId(newView.id),
          name: newView.name,
          renderableType: 'RELATION',
          value: EntityId(newView.id),
        },
      };

      DB.upsertRelation({
        relation: newRelation,
        spaceId,
      });
    }
  };

  const toggleProperty = (newColumn: Column, selector?: string) => {
    const isShown = shownColumnRelations.map(relation => relation.toEntity.id).includes(EntityId(newColumn.id));
    const shownColumnRelation = shownColumnRelations.find(relation => relation.toEntity.id === newColumn.id);

    const newId = selector ? ID.createEntityId() : undefined;

    const existingMapping = mapping[newColumn.id];

    // We run a separate branch of logic for RELATIONS queries where a selector may get passed through.
    //
    // If the selector is already active, when toggling the property it removes the shown property.
    // If the selector is not active, is deletes any existing shown property for the property id and
    // creates a new one with the new selector.
    //
    // Yes this looks janky
    if (selector && newId) {
      if (selector === existingMapping) {
        if (shownColumnRelation) {
          DB.removeRelation({ relation: shownColumnRelation, spaceId });
        }
      } else {
        if (shownColumnRelation) {
          // @TODO: We should instead just upsert the new selector instead of removing and creating
          // a new relation. Main issue right now is that the block won't re-render if we use this
          // approach due to how the mappings are queried.
          DB.removeRelation({ relation: shownColumnRelation, spaceId });
        }

        DB.upsert(
          {
            attributeId: SystemIds.SELECTOR_ATTRIBUTE,
            attributeName: 'Selector',
            entityId: newId,
            entityName: null,
            value: {
              type: 'TEXT',
              value: selector,
            },
          },
          spaceId
        );

        const newRelation: StoreRelation = {
          id: newId,
          space: spaceId,
          index: INITIAL_RELATION_INDEX_VALUE,
          typeOf: {
            id: EntityId(SystemIds.PROPERTIES),
            name: 'Properties',
          },
          fromEntity: {
            id: EntityId(relationId),
            name: blockRelation?.name ?? null,
          },
          toEntity: {
            id: EntityId(newColumn.id),
            name: newColumn.name,
            renderableType: 'RELATION',
            value: EntityId(newColumn.id),
          },
        };

        DB.upsertRelation({
          relation: newRelation,
          spaceId,
        });
      }

      return;
    }

    if (!isShown) {
      const newRelation: StoreRelation = {
        id: newId,
        space: spaceId,
        index: INITIAL_RELATION_INDEX_VALUE,
        typeOf: {
          id: EntityId(SystemIds.PROPERTIES),
          name: 'Properties',
        },
        fromEntity: {
          id: EntityId(relationId),
          name: blockRelation?.name ?? null,
        },
        toEntity: {
          id: EntityId(newColumn.id),
          name: newColumn.name,
          renderableType: 'RELATION',
          value: EntityId(newColumn.id),
        },
      };

      DB.upsertRelation({
        relation: newRelation,
        spaceId,
      });
    } else {
      if (shownColumnRelation) {
        DB.removeRelation({ relation: shownColumnRelation, spaceId });
      }
    }
  };

  return {
    isLoading: isLoading || isLoadingIndices,
    isFetched,
    view,
    placeholder,
    viewRelation,
    setView,
    shownColumnIds,
    // Return sorted relations instead of original
    shownColumnRelations: sortedShownColumnRelations,
    toggleProperty,
    mapping,
    // Add the reorder function to the return value
    reorderShownColumns,
  };
}

export type DataBlockView = 'TABLE' | 'LIST' | 'GALLERY';

const getView = (viewRelation: Relation | undefined): DataBlockView => {
  let view: DataBlockView = 'TABLE';

  if (viewRelation) {
    switch (viewRelation?.toEntity.id.toString()) {
      case SystemIds.TABLE_VIEW:
        view = 'TABLE';
        break;
      case SystemIds.LIST_VIEW:
        view = 'LIST';
        break;
      case SystemIds.GALLERY_VIEW:
        view = 'GALLERY';
        break;
      default:
        // We default to TABLE above
        break;
    }
  }

  return view;
};

const getPlaceholder = (blockEntity: Entity | null | undefined, view: DataBlockView) => {
  let text = DEFAULT_PLACEHOLDERS[view].text;
  // eslint-disable-next-line prefer-const
  let image = getImagePath(DEFAULT_PLACEHOLDERS[view].image);

  if (blockEntity) {
    const placeholderTextTriple = blockEntity.triples.find(triple => triple.attributeId === SystemIds.PLACEHOLDER_TEXT);

    if (placeholderTextTriple && placeholderTextTriple.value.type === 'TEXT') {
      text = placeholderTextTriple.value.value;
    }

    // @TODO(relations): This should be a relation pointing to the image entity
    // const placeholderImageRelation = // find relation with attributeId SystemIds.PLACEHOLDER_IMAGE
  }

  // @TODO(relations): This should be a relation pointing to the image entity
  return { text, image };
};

const DEFAULT_PLACEHOLDERS: Record<DataBlockView, { text: string; image: string }> = {
  TABLE: {
    text: 'Add an entity',
    image: '/table.png',
  },
  LIST: {
    text: 'Add a list item',
    image: '/list.png',
  },
  GALLERY: {
    text: 'Add a gallery card',
    image: '/gallery.png',
  },
};
