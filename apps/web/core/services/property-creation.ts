import { Id, Position, SystemIds } from '@graphprotocol/grc-20';
import { RENDERABLE_TYPE_PROPERTY, DATA_TYPE_PROPERTY } from '~/core/constants';
import { SwitchableRenderableType } from '~/core/v2.types';
import { Properties } from '~/core/utils/property';
import { PropertyStorage } from './property-creation.types';

/**
 * Parameters for creating a new property
 */
export interface CreatePropertyParams {
  /** The entity ID for the property */
  entityId: string;
  /** The space ID where the property will be created */
  spaceId: string;
  /** The name of the property */
  name: string;
  /** The property type (determines base data type and renderable type) */
  propertyType: SwitchableRenderableType;
  /** Whether the property is verified */
  verified?: boolean;
  /** The space where the property belongs */
  space?: string;
}

/**
 * Parameters for adding a property to an entity
 */
export interface AddPropertyToEntityParams {
  /** The entity ID to add the property to */
  entityId: string;
  /** The property ID to add */
  propertyId: string;
  /** The property name */
  propertyName: string;
  /** The space ID */
  spaceId: string;
  /** The entity name */
  entityName?: string;
}

/**
 * Service for handling property creation operations
 */
export class PropertyCreationService {
  constructor(private storage: PropertyStorage) {}

  /**
   * Creates a new property with the specified configuration
   */
  createProperty(params: CreatePropertyParams): void {
    const { entityId, spaceId, name, propertyType, verified = false, space } = params;
    const { baseDataType, renderableTypeId } = Properties.mapPropertyType(propertyType);

    // Create the name value
    this.storage.values.set({
      entity: {
        id: entityId,
        name: name,
      },
      property: {
        id: SystemIds.NAME_PROPERTY,
        name: 'Name',
        dataType: 'TEXT',
      },
      spaceId,
      value: name,
    });

    // Create the dataType value
    this.storage.values.set({
      entity: {
        id: entityId,
        name: name,
      },
      property: {
        id: DATA_TYPE_PROPERTY,
        name: 'Data Type',
        dataType: 'TEXT',
      },
      spaceId,
      value: baseDataType,
    });

    // Create the Property type relation
    this.storage.relations.set({
      id: Id.generate(),
      entityId: Id.generate(),
      spaceId,
      renderableType: 'RELATION',
      verified,
      toSpaceId: space,
      position: Position.generate(),
      type: {
        id: SystemIds.TYPES_PROPERTY,
        name: 'Types',
      },
      fromEntity: {
        id: entityId,
        name: name,
      },
      toEntity: {
        id: SystemIds.PROPERTY,
        name: 'Property',
        value: SystemIds.PROPERTY,
      },
    });

    // If there's a renderableType, create the relation
    if (renderableTypeId) {
      this.storage.relations.set({
        id: Id.generate(),
        entityId: Id.generate(),
        spaceId,
        renderableType: 'RELATION',
        verified: false,
        position: Position.generate(),
        type: {
          id: RENDERABLE_TYPE_PROPERTY,
          name: 'Renderable Type',
        },
        fromEntity: {
          id: entityId,
          name: name,
        },
        toEntity: {
          id: renderableTypeId,
          name: propertyType,
          value: renderableTypeId,
        },
      });
    }
  }

  /**
   * Adds an existing property to an entity by creating a placeholder value
   */
  addPropertyToEntity(params: AddPropertyToEntityParams): void {
    const { entityId, propertyId, propertyName, spaceId, entityName } = params;

    this.storage.values.set({
      spaceId,
      entity: {
        id: entityId,
        name: entityName || null,
      },
      property: {
        id: propertyId,
        name: propertyName,
        dataType: 'TEXT', // Start with TEXT, will be corrected by the system
      },
      value: '',
    });
  }
}

/**
 * Factory function to create a PropertyCreationService instance
 */
export function createPropertyCreationService(storage: PropertyStorage): PropertyCreationService {
  return new PropertyCreationService(storage);
}