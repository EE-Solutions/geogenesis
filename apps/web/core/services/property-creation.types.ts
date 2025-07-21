import { OmitStrict } from '~/core/types';
import { DataType, Property, Relation, Value } from '~/core/v2.types';

/**
 * Interface for value storage operations
 */
export interface ValueStore {
  set: (value: OmitStrict<Value, 'id'> & { id?: string }) => void;
  get: (id: string, entityId: string) => Value | null;
  delete: (value: Value) => void;
}

/**
 * Interface for relation storage operations
 */
export interface RelationStore {
  set: (relation: Relation) => void;
  get: (id: string, entityId: string) => Relation | null;
  delete: (relation: Relation) => void;
}

/**
 * Interface for entity storage operations
 */
export interface EntityStore {
  name: {
    set: (entityId: string, spaceId: string, value: string) => void;
  };
}

/**
 * Interface for property storage operations
 */
export interface PropertyStore {
  create: (params: { entityId: string; spaceId: string; name: string; dataType: DataType }) => void;
  get: (id: string) => Property | null;
}

/**
 * Complete storage interface for property creation operations
 */
export interface PropertyStorage {
  values: ValueStore;
  relations: RelationStore;
  entities: EntityStore;
  properties: PropertyStore;
}

/**
 * Type for property entity reference
 */
export interface PropertyEntityReference {
  id: string;
  name: string | null;
}

/**
 * Type for property type reference
 */
export interface PropertyTypeReference {
  id: string;
  name: string;
}

/**
 * Type for relation entity reference
 */
export interface RelationEntityReference {
  id: string;
  name: string | null;
  value?: string;
}