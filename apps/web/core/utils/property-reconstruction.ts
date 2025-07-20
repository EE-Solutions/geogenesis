import { SystemIds } from '@graphprotocol/grc-20';
import { DATA_TYPE_PROPERTY, RENDERABLE_TYPE_PROPERTY } from '../constants';
import { DataType, Property, Relation, Value } from '../v2.types';

/**
 * Reconstructs a Property object from store data for properties that haven't been registered with setDataType()
 * Used as fallback when store.getProperty() returns null for existing properties added to entities
 */
export function reconstructPropertyFromStore(
  id: string,
  getValues: (selector: { selector: (v: Value) => boolean }) => Value[],
  getRelations: (selector: { selector: (r: Relation) => boolean }) => Relation[]
): Property | null {
  // Check if this entity has a Property type relation
  const hasPropertyType = getRelations({ 
    selector: r => r.fromEntity.id === id && 
                   r.type.id === SystemIds.TYPES_PROPERTY && 
                   r.toEntity.id === SystemIds.PROPERTY
  }).length > 0;

  if (!hasPropertyType) {
    return null;
  }

  // Get the dataType value
  const dataTypeValue = getValues({
    selector: v => v.entity.id === id && 
                    v.property.id === DATA_TYPE_PROPERTY
  })[0];

  if (!dataTypeValue) {
    return null;
  }

  // Get the name value
  const nameValue = getValues({
    selector: v => v.entity.id === id && 
                    v.property.id === SystemIds.NAME_PROPERTY
  })[0];

  // Get the renderableType relation (if any)
  const renderableTypeRelation = getRelations({
    selector: r => r.fromEntity.id === id && 
                    r.type.id === RENDERABLE_TYPE_PROPERTY
  })[0];

  // Validate and cast dataType
  const validDataTypes: DataType[] = ['TEXT', 'NUMBER', 'CHECKBOX', 'TIME', 'POINT', 'RELATION'];
  const dataTypeString = String(dataTypeValue.value);
  const dataType: DataType = validDataTypes.includes(dataTypeString as DataType) 
    ? (dataTypeString as DataType) 
    : 'TEXT';

  // Construct a Property object
  const property: Property = {
    id,
    name: nameValue?.value || '',
    dataType,
    renderableType: renderableTypeRelation?.toEntity.id || null,
  };

  return property;
}