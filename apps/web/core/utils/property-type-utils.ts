import { SystemIds } from '@graphprotocol/grc-20';
import { GEO_LOCATION } from '../constants';
import { SwitchableRenderableType } from '../v2.types';

/**
 * Maps renderable type entity names/IDs to SwitchableRenderableType values
 * Handles various naming conventions and IDs
 */
export function mapRenderableTypeToSwitchable(
  renderableTypeName: string,
  renderableTypeId: string,
  fallbackDataType: string
): SwitchableRenderableType {
  // Normalize the name for comparison
  const normalizedName = renderableTypeName.toLowerCase().replace(/[\s-_]/g, '');
  
  // Check by normalized name first
  if (normalizedName === 'url') {
    return 'URL';
  }
  
  if (normalizedName === 'geolocation') {
    return 'GEO_LOCATION';
  }
  
  if (normalizedName === 'image') {
    return 'IMAGE';
  }
  
  // Check by ID as fallback
  if (renderableTypeId === SystemIds.URL) {
    return 'URL';
  }
  
  if (renderableTypeId === GEO_LOCATION) {
    return 'GEO_LOCATION';
  }
  
  if (renderableTypeId === SystemIds.IMAGE) {
    return 'IMAGE';
  }
  
  // Default to the base dataType
  return fallbackDataType as SwitchableRenderableType;
}

/**
 * Determines if a property is unpublished based on its relations
 */
export function isPropertyUnpublished(
  propertyData: any,
  propertyTypeRelation: any
): boolean {
  if (!propertyData) {
    return false;
  }
  
  // If the relation exists and is local/unpublished, then the property is unpublished
  return propertyTypeRelation && 
         (propertyTypeRelation.isLocal === true || propertyTypeRelation.hasBeenPublished === false);
}

/**
 * Constructs property data type information from various sources
 */
export function constructPropertyDataType(
  propertyData: any,
  renderableTypeEntity: any,
  renderableTypeRelation: any,
  entityId: string,
  hasLocalPropertyType: boolean
): { id: string; dataType: string; renderableType: { id: string; name: string } | null } | null {
  // If we have propertyData from the backend, use it
  if (propertyData) {
    let renderableType = null;
    
    // First check if we have a renderableTypeEntity (from remote data)
    if (propertyData.renderableType && renderableTypeEntity) {
      renderableType = {
        id: renderableTypeEntity.id,
        name: renderableTypeEntity.name,
      };
    } 
    // Otherwise check for local renderableType relation
    else if (renderableTypeRelation) {
      renderableType = {
        id: renderableTypeRelation.toEntity.id,
        name: renderableTypeRelation.toEntity.name,
      };
    }

    return {
      id: propertyData.id || '',
      dataType: propertyData.dataType || '',
      renderableType,
    };
  }
  
  // For local properties without remote data
  if (hasLocalPropertyType) {
    return {
      id: entityId,
      dataType: propertyData?.dataType || 'TEXT',
      renderableType: renderableTypeRelation ? {
        id: renderableTypeRelation.toEntity.id,
        name: renderableTypeRelation.toEntity.name,
      } : null,
    };
  }
  
  return null;
}

/**
 * Determines the current renderable type for display in the dropdown
 */
export function getCurrentRenderableType(
  propertyDataType: { dataType: string; renderableType: { id: string; name: string } | null } | null
): SwitchableRenderableType | undefined {
  if (!propertyDataType) return undefined;
  
  // If there's a renderableType, map it to the appropriate type
  if (propertyDataType.renderableType) {
    return mapRenderableTypeToSwitchable(
      propertyDataType.renderableType.name,
      propertyDataType.renderableType.id,
      propertyDataType.dataType
    );
  }
  
  // Otherwise, default to the base dataType
  return propertyDataType.dataType as SwitchableRenderableType;
}