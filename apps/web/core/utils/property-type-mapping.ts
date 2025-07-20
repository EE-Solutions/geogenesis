import { SystemIds } from '@graphprotocol/grc-20';
import { GEO_LOCATION } from '~/core/constants';
import { DataType, SwitchableRenderableType } from '~/core/v2.types';

/**
 * Interface for property type mapping configuration
 */
export interface PropertyTypeMapping {
  /** The base data type for the property */
  baseDataType: DataType;
  /** The renderable type ID if different from base type, null otherwise */
  renderableTypeId: string | null;
}

/**
 * Maps a switchable renderable type to its base data type and renderable type ID
 * @param type The switchable renderable type to map
 * @returns The property type mapping configuration
 */
export function mapPropertyType(type: SwitchableRenderableType): PropertyTypeMapping {
  switch (type) {
    case 'TEXT':
      return {
        baseDataType: 'TEXT',
        renderableTypeId: null,
      };
    case 'URL':
      return {
        baseDataType: 'TEXT',
        renderableTypeId: SystemIds.URL,
      };
    case 'GEO_LOCATION':
      return {
        baseDataType: 'POINT',
        renderableTypeId: GEO_LOCATION,
      };
    case 'RELATION':
      return {
        baseDataType: 'RELATION',
        renderableTypeId: null,
      };
    case 'IMAGE':
      return {
        baseDataType: 'RELATION',
        renderableTypeId: SystemIds.IMAGE,
      };
    case 'NUMBER':
      return {
        baseDataType: 'NUMBER',
        renderableTypeId: null,
      };
    case 'CHECKBOX':
      return {
        baseDataType: 'CHECKBOX',
        renderableTypeId: null,
      };
    case 'TIME':
      return {
        baseDataType: 'TIME',
        renderableTypeId: null,
      };
    case 'POINT':
      return {
        baseDataType: 'POINT',
        renderableTypeId: null,
      };
    default:
      console.warn('Unknown property type:', type);
      return {
        baseDataType: 'TEXT',
        renderableTypeId: null,
      };
  }
}

/**
 * Map of property types to their base data types for filtering purposes
 */
export const typeToBaseDataType: Record<SwitchableRenderableType, string> = {
  TEXT: 'TEXT',
  URL: 'TEXT',
  RELATION: 'RELATION',
  IMAGE: 'RELATION',
  NUMBER: 'NUMBER',
  CHECKBOX: 'CHECKBOX',
  TIME: 'TIME',
  POINT: 'POINT',
  GEO_LOCATION: 'POINT',
};