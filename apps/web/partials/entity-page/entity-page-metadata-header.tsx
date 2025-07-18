'use client';

import { Id, Position, SystemIds } from '@graphprotocol/grc-20';

import * as React from 'react';

import { RENDERABLE_TYPE_PROPERTY, DATA_TYPE_PROPERTY, GEO_LOCATION } from '~/core/constants';
import { useUserIsEditing } from '~/core/hooks/use-user-is-editing';
import { ID } from '~/core/id';
import { useMutate } from '~/core/sync/use-mutate';
import { useQueryEntity, useQueryProperty, useRelations } from '~/core/sync/use-store';
import { SwitchableRenderableType } from '~/core/v2.types';

import { Divider } from '~/design-system/divider';

import { DataTypePill } from './data-type-pill';
import { RelationsGroup as EditableRelationsGroup } from './editable-entity-page';
import { PropertyTypeDropdown } from './property-type-dropdown';
import { RelationsGroup as ReadableRelationsGroup } from './readable-entity-page';
import { useEntityStoreInstance } from '~/core/state/entity-page-store/entity-store-provider';
import { useName } from '~/core/state/entity-page-store/entity-store';
import { mapPropertyType } from '~/core/utils/property-type-mapping';

interface EntityPageMetadataHeaderProps {
  id: string;
  spaceId: string;
}

export function EntityPageMetadataHeader({ id, spaceId }: EntityPageMetadataHeaderProps) {
  const { id: entityId } = useEntityStoreInstance();
  const relations = useRelations({
    selector: r => r.fromEntity.id === entityId && r.spaceId === spaceId,
  })
  const name = useName(entityId);
  
  const { storage } = useMutate();

  const editable = useUserIsEditing(spaceId);

  // Fetch property data type to see if this is a property entity
  const { property: propertyData } = useQueryProperty({
    id,
    spaceId,
    enabled: true,
  });

  // Check if this entity has a Property type relation (local property check)
  const hasLocalPropertyType = relations.find(
    r => r.fromEntity.id === entityId && 
         r.type.id === SystemIds.TYPES_PROPERTY && 
         r.toEntity.id === SystemIds.PROPERTY
  );

  // Determine if property is unpublished by checking if the property data is local only
  const isUnpublishedProperty = React.useMemo(() => {
    // If no property data exists, it's not a property
    if (!propertyData) {
      return false;
    }
    
    // Check if the property has been published by looking at local relations/values
    // If the Property type relation is local and hasn't been published, it's unpublished
    const propertyTypeRelation = relations.find(
      r => r.fromEntity.id === entityId && 
           r.type.id === SystemIds.TYPES_PROPERTY && 
           r.toEntity.id === SystemIds.PROPERTY
    );
    
    // If the relation exists and is local/unpublished, then the property is unpublished
    return propertyTypeRelation && 
           (propertyTypeRelation.isLocal === true || propertyTypeRelation.hasBeenPublished === false);
  }, [propertyData, relations, entityId]);

  // Find renderableType relation
  const renderableTypeRelation = relations.find(
    r => r.fromEntity.id === entityId && r.type.id === RENDERABLE_TYPE_PROPERTY
  );
  
  const { entity: renderableTypeEntity } = useQueryEntity({
    id: propertyData?.renderableType || renderableTypeRelation?.toEntity.id || undefined,
    spaceId,
    enabled: !!(propertyData?.renderableType || renderableTypeRelation?.toEntity.id),
  });

  const isPropertyEntity = !!propertyData


  const propertyDataType = React.useMemo(() => {
    // If we have propertyData from the backend, use it
    if (propertyData) {
      let renderableType = null;
      if (propertyData.renderableType && renderableTypeEntity) {
        // It's a UUID, use the entity data
        renderableType = {
          id: renderableTypeEntity.id,
          name: renderableTypeEntity.name,
        };
      }

      return {
        id: propertyData.id || '',
        dataType: propertyData.dataType || '',
        renderableType,
      };
    }
    
    return null;
  }, [propertyData, renderableTypeEntity, entityId, renderableTypeRelation]);

  // Determine the current renderable type based on property data
  const currentRenderableType = React.useMemo(() => {
    
    if (!propertyDataType) return undefined;
    
    // If there's a renderableType relation, map it to the appropriate type
    if (propertyDataType.renderableType) {
      const renderableTypeName = propertyDataType.renderableType.name;
      
      
      // Map renderableType entity names to SwitchableRenderableType
      let mappedType: SwitchableRenderableType;
      const renderableTypeId = propertyDataType.renderableType.id;
      
      
      switch (renderableTypeName) {
        case 'URL':
        case 'url':
          mappedType = 'URL';
          break;
        case 'GeoLocation':
        case 'Geo Location':
        case 'geo-location':
          mappedType = 'GEO_LOCATION';
          break;
        case 'Image':
        case 'image':
          mappedType = 'IMAGE';
          break;
        default:
          // If we can't map it, check if it's a placeholder ID we created
          if (renderableTypeName === 'URL' || renderableTypeId === SystemIds.URL) {
            mappedType = 'URL';
          } else if (renderableTypeName === 'GEO_LOCATION' || renderableTypeId === GEO_LOCATION) {
            mappedType = 'GEO_LOCATION';
          } else if (renderableTypeName === 'IMAGE' || renderableTypeId === SystemIds.IMAGE) {
            mappedType = 'IMAGE';
          } else {
            mappedType = propertyDataType.dataType as SwitchableRenderableType;
          }
      }
      
      
      return mappedType;
    }
    
    // Otherwise, default to the base dataType
    const baseType = propertyDataType.dataType as SwitchableRenderableType;
    return baseType;
  }, [propertyDataType, renderableTypeRelation]);

  const handlePropertyTypeChange = React.useCallback(
    (newType: SwitchableRenderableType) => {

      if (!entityId || !spaceId) return;

      // Determine the base dataType and renderableType based on the selected type
      let baseDataType: string;
      let renderableTypeId: string | null = null;

      // Map property types to their base dataType and renderableType
      const mapping = mapPropertyType(newType);
      baseDataType = mapping.baseDataType;
      renderableTypeId = mapping.renderableTypeId;


      // Published properties can't change their base dataType
      if (!isUnpublishedProperty && propertyData && propertyData.dataType !== baseDataType) {
        console.warn('Cannot change property dataType from', propertyData.dataType, 'to', baseDataType);
        console.warn('Published properties cannot change their base dataType');
        return;
      }

      // Update the dataType value if it's different from the current one
      if (propertyData?.dataType !== baseDataType) {
        storage.values.set({
          id: ID.createValueId({
            entityId,
            propertyId: DATA_TYPE_PROPERTY,
            spaceId,
          }),
          entity: {
            id: entityId,
            name: name || '',
          },
          property: {
            id: DATA_TYPE_PROPERTY,
            name: 'Data Type',
            dataType: 'TEXT',
          },
          spaceId,
          value: baseDataType,
        });
      } else if (!propertyData) {
        // If no dataType value exists and no propertyData, create the dataType value
        storage.values.set({
          id: ID.createValueId({
            entityId,
            propertyId: DATA_TYPE_PROPERTY,
            spaceId,
          }),
          entity: {
            id: entityId,
            name: name || '',
          },
          property: {
            id: DATA_TYPE_PROPERTY,
            name: 'Data Type',
            dataType: 'TEXT',
          },
          spaceId,
          value: baseDataType,
        });
      }

      // Handle the renderableType relation

      const existingRelation = relations.find(
        r => r.fromEntity.id === entityId && r.type.id === RENDERABLE_TYPE_PROPERTY
      );


      if (renderableTypeId) {
        // Need to set or update the renderableType relation
        if (existingRelation) {
          // Update existing relation
          storage.relations.update(existingRelation, draft => {
            draft.toEntity.id = renderableTypeId;
            draft.toEntity.name = newType;
            draft.toEntity.value = renderableTypeId;
          });
        } else {
          // Create new relation
          storage.relations.set({
            id: Id.generate(),
            entityId: ID.createEntityId(),
            fromEntity: {
              id: entityId,
              name: propertyData?.name || '',
            },
            type: {
              id: RENDERABLE_TYPE_PROPERTY,
              name: 'Renderable Type',
            },
            toEntity: {
              id: renderableTypeId,
              name: newType,
              value: renderableTypeId,
            },
            spaceId,
            position: Position.generate(),
            verified: false,
            renderableType: 'RELATION',
          });
        }
      } else {
        // Remove renderableType relation if it exists
        if (existingRelation) {
          storage.relations.delete(existingRelation);
        } else {
        }
      }
    },
    [entityId, spaceId, storage, propertyData, relations, currentRenderableType, isUnpublishedProperty, name]
  );

  // Create property data when Property type is added
  React.useEffect(() => {
    // Check if there's already a Property type relation to avoid duplicates
    const existingPropertyTypeRelation = relations.find(
      r => r.fromEntity.id === entityId && r.type.id === SystemIds.TYPES_PROPERTY && r.toEntity.id === SystemIds.PROPERTY
    );
    
    // Only create property if:
    // 1. Entity has Property type
    // 2. No property data exists from backend
    // 3. No dataType value exists (meaning we haven't created it yet)
    // 4. No existing Property type relation exists
    if (existingPropertyTypeRelation && !propertyData && entityId && spaceId) {
      
      // Create the property with a default dataType of TEXT
      storage.properties.create({
        entityId,
        spaceId,
        name: name || 'New Property',
        dataType: 'TEXT',
      });
    }
  }, [propertyData, entityId, spaceId, storage, name, relations]);

  // Debug logging
  React.useEffect(() => {
    if (propertyData) {
    }
  }, [entityId, propertyData, propertyDataType, currentRenderableType]);

  return (
    <div className="flex items-center gap-2 text-text">
      {isPropertyEntity && editable && (
        <div className="flex items-center gap-2">
          <PropertyTypeDropdown 
            value={currentRenderableType} 
            onChange={handlePropertyTypeChange}
            baseDataType={isUnpublishedProperty ? undefined : propertyDataType?.dataType}
          />
          <Divider type="vertical" style="solid" className="h-[12px] border-divider" />
        </div>
      )}
      {(propertyDataType && !editable) && (
        <div className="h-100 mt-1 flex items-end">
          <DataTypePill
            dataType={propertyDataType.dataType}
            renderableType={propertyDataType.renderableType}
            spaceId={spaceId}
          />
        </div>
      )}
      {editable ? (
        <EditableRelationsGroup id={id} spaceId={spaceId} propertyId={SystemIds.TYPES_PROPERTY} />
      ) : (
        <ReadableRelationsGroup
          entityId={id}
          spaceId={spaceId}
          propertyId={SystemIds.TYPES_PROPERTY}
          isMetadataHeader={true}
        />
      )}
    </div>
  );
}
