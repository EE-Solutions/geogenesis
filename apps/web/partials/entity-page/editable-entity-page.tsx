'use client';

import { GraphUrl, SystemIds, Relation as R } from '@graphprotocol/grc-20';
import { Image } from '@graphprotocol/grc-20';
import { INITIAL_RELATION_INDEX_VALUE } from '@graphprotocol/grc-20/constants';
import { Reorder } from 'framer-motion';

import * as React from 'react';

import { StoreRelation } from '~/core/database/types';
import { DB } from '~/core/database/write';
import { useEditEvents } from '~/core/events/edit-events';
import { useProperties } from '~/core/hooks/use-properties';
import { useRelationship } from '~/core/hooks/use-relationship';
import { useRenderables } from '~/core/hooks/use-renderables';
import { ID } from '~/core/id';
import { EntityId } from '~/core/io/schema';
import { useEntityPageStore } from '~/core/state/entity-page-store/entity-store';
import {
  PropertySchema,
  Relation,
  RelationRenderableProperty,
  RenderableProperty,
  TripleRenderableProperty,
} from '~/core/types';
import { Triple as ITriple } from '~/core/types';
import { NavUtils, getImagePath } from '~/core/utils/utils';

import { EntityTextAutocomplete } from '~/design-system/autocomplete/entity-text-autocomplete';
import { SquareButton } from '~/design-system/button';
import { Checkbox, getChecked } from '~/design-system/checkbox';
import { LinkableRelationChip } from '~/design-system/chip';
import { DateField } from '~/design-system/editable-fields/date-field';
import { ImageZoom, PageImageField, PageStringField } from '~/design-system/editable-fields/editable-fields';
import { NumberField } from '~/design-system/editable-fields/number-field';
import { WebUrlField } from '~/design-system/editable-fields/web-url-field';
import { Create } from '~/design-system/icons/create';
import { Trash } from '~/design-system/icons/trash';
import { PrefetchLink as Link } from '~/design-system/prefetch-link';
import { SelectEntity } from '~/design-system/select-entity';
import { SelectEntityAsPopover } from '~/design-system/select-entity-dialog';
import { Text } from '~/design-system/text';

import { DateFormatDropdown } from './date-format-dropdown';
import { getRenderableTypeSelectorOptions } from './get-renderable-type-options';
import { NumberOptionsDropdown } from './number-options-dropdown';
import { RenderableTypeDropdown } from './renderable-type-dropdown';
import { useQueryEntities } from '~/core/sync/use-store';

interface Props {
  triples: ITriple[];
  id: string;
  spaceId: string;
  relationsOut: Relation[];
}

export function EditableEntityPage({ id, spaceId, triples: serverTriples }: Props) {
  const entityId = id;

  const [isRelationPage] = useRelationship(entityId, spaceId);

  const { renderablesGroupedByAttributeId, addPlaceholderRenderable, removeEmptyPlaceholderRenderable } =
    useRenderables(serverTriples, spaceId, isRelationPage);
  const { name } = useEntityPageStore();

  const send = useEditEvents({
    context: {
      entityId,
      spaceId,
      entityName: name ?? '',
    },
  });

  const properties = useProperties(Object.keys(renderablesGroupedByAttributeId));

  return (
    <>
      <div className="rounded-lg border border-grey-02 shadow-button">
        <div className="flex flex-col gap-6 p-5">
          {Object.entries(renderablesGroupedByAttributeId).map(([attributeId, renderables]) => {
            // Triple groups only ever have one renderable
            const firstRenderable = renderables[0];
            const renderableType = firstRenderable.type;

            // @TODO: We can abstract this away. We also don't need to pass in the first renderable to options func.
            const selectorOptions = getRenderableTypeSelectorOptions(
              firstRenderable,
              placeholderRenderable => {
                if (!firstRenderable.placeholder) {
                  send({ type: 'DELETE_RENDERABLE', payload: { renderable: firstRenderable } });
                }
                addPlaceholderRenderable(placeholderRenderable);
              },
              send
            );

            return (
              <div key={`${id}-${attributeId}`} className="relative break-words">
                <EditableAttribute
                  renderable={firstRenderable}
                  onChange={() => {
                    // If we create a placeholder using the + button the placeholder gets an empty
                    // attribute id. If we then add an attribute the placeholder won't get removed
                    // because the placeholder attribute id is different than the new attribute id.
                    //
                    // Here we manually remove the placeholder when the attribute is changed. This is
                    // a bit of different control flow from how we handle other placeholders, but it's
                    // only necessary on entity pages.
                    if (firstRenderable.placeholder === true && firstRenderable.attributeId === '') {
                      removeEmptyPlaceholderRenderable(firstRenderable);
                    }
                  }}
                />
                {renderableType === 'RELATION' || renderableType === 'IMAGE' ? (
                  <RelationsGroup
                    key={attributeId}
                    relations={renderables as RelationRenderableProperty[]}
                    properties={properties}
                  />
                ) : (
                  <TriplesGroup key={attributeId} triples={renderables as TripleRenderableProperty[]} />
                )}

                <div className="absolute right-0 top-6 flex items-center gap-1">
                  {/* Entity renderables only exist on Relation entities and are not changeable to another renderable type */}
                  <>
                    {renderableType === 'TIME' && (
                      <DateFormatDropdown
                        value={firstRenderable.options?.format}
                        onSelect={(format: string) => {
                          send({
                            type: 'UPSERT_RENDERABLE_TRIPLE_VALUE',
                            payload: {
                              renderable: firstRenderable,
                              value: {
                                value: firstRenderable.value,
                                type: 'TIME',
                                options: {
                                  format,
                                },
                              },
                            },
                          });
                        }}
                      />
                    )}
                    {renderableType === 'NUMBER' && (
                      <NumberOptionsDropdown
                        value={firstRenderable.value}
                        format={firstRenderable.options?.format}
                        onSelect={(format: string) => {
                          send({
                            type: 'UPSERT_RENDERABLE_TRIPLE_VALUE',
                            payload: {
                              renderable: firstRenderable,
                              value: {
                                value: firstRenderable.value,
                                type: 'NUMBER',
                                options: {
                                  format,
                                },
                              },
                            },
                          });
                        }}
                      />
                    )}
                    <RenderableTypeDropdown value={renderableType} options={selectorOptions} />

                    {/* Relation renderable types don't render the delete button. Instead you delete each individual relation */}
                    {renderableType !== 'RELATION' && (
                      <SquareButton
                        icon={<Trash />}
                        onClick={() => {
                          send({ type: 'DELETE_RENDERABLE', payload: { renderable: firstRenderable } });
                        }}
                      />
                    )}
                  </>
                </div>
              </div>
            );
          })}
        </div>
        <div className="p-4">
          <SquareButton
            onClick={() => {
              addPlaceholderRenderable({
                type: 'TEXT',
                entityId: id,
                entityName: name ?? '',
                attributeId: '',
                attributeName: null,
                value: '',
                spaceId,
                placeholder: true,
              });
            }}
            icon={<Create />}
          />
        </div>
      </div>
    </>
  );
}

function EditableAttribute({ renderable, onChange }: { renderable: RenderableProperty; onChange: () => void }) {
  const { id, name, spaceId } = useEntityPageStore();

  const send = useEditEvents({
    context: {
      entityId: id,
      spaceId,
      entityName: name ?? '',
    },
  });

  if (renderable.attributeId === '') {
    return (
      <EntityTextAutocomplete
        spaceId={spaceId}
        placeholder="Add Property..."
        onDone={result => {
          onChange();
          send({
            type: 'UPSERT_ATTRIBUTE',
            payload: { renderable, attributeId: result.id, attributeName: result.name },
          });
        }}
        filterByTypes={[{ typeId: SystemIds.ATTRIBUTE, typeName: 'Attribute' }]}
        alreadySelectedIds={[]}
      />
    );
  }

  return (
    <Link href={NavUtils.toEntity(spaceId, renderable.attributeId)}>
      <Text as="p" variant="bodySemibold">
        {renderable.attributeName ?? renderable.attributeId}
      </Text>
    </Link>
  );
}

type RelationsGroupProps = {
  relations: RelationRenderableProperty[];
  properties?: Record<string, PropertySchema>;
};

function RelationsGroup({ relations, properties }: RelationsGroupProps) {
  const { id, name, spaceId } = useEntityPageStore();

  const send = useEditEvents({
    context: {
      entityId: id,
      spaceId,
      entityName: name ?? '',
    },
  });

  const hasPlaceholders = relations.some(r => r.placeholder === true);
  const typeOfId = relations[0].attributeId;
  const typeOfName = relations[0].attributeName;
  const typeOfRenderableType = relations[0].type;
  const property = properties?.[typeOfId];
  const relationValueTypes = property?.relationValueTypes;
  const filterByTypes = property?.relationValueTypes?.map(r => r.typeId);    

  const [relationItems, setRelationItems] = React.useState<RelationRenderableProperty[]>(relations);
  const [relationIndices, setRelationIndices] = React.useState<Record<string, string>>({});
  
  const { entities: collectionItems, isLoading: isCollectionItemsLoading } = useQueryEntities({
    enabled: relations !== null,
    where: {
      id: {
        in: relationItems.map(r => r.relationId),
      },
    },
  });

  React.useEffect(() => {
    setRelationItems(relations);
  }, [relations]);

  React.useEffect(() => {
    if (!isCollectionItemsLoading && collectionItems) {
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
  }, [collectionItems, isCollectionItemsLoading, relationItems]);

  const handleReorder = (reorderedItems: RelationRenderableProperty[]) => {
    setRelationItems(reorderedItems);
    
    // Update the relation indices in the database based on the new order
    reorderedItems.forEach((item, index) => {
      // Find the relations before and after the current item
      const beforeItem = index > 0 ? reorderedItems[index - 1] : undefined;
      const afterItem = index < reorderedItems.length - 1 ? reorderedItems[index + 1] : undefined;
      
      // Get the index values for the items before and after the current item
      const beforeIndex = beforeItem ? relationIndices[beforeItem.relationId] : undefined;
      const afterIndex = afterItem ? relationIndices[afterItem.relationId] : undefined;
      
      // Drop afterIndex if it equals beforeIndex to avoid collisions
      const finalAfterIndex = beforeIndex === afterIndex ? undefined : afterIndex;

      // Use R.reorder to calculate the new index value
      const newTripleOrdering = R.reorder({
        relationId: item.relationId,
        beforeIndex: beforeIndex,
        afterIndex: finalAfterIndex,
      });

      console.log(`New triple ordering for ${item.relationId}:`, newTripleOrdering);
      
      // Update the index in the database
      DB.upsert({
        entityId: item.relationId,
        attributeId: SystemIds.RELATION_INDEX,
        attributeName: 'Index',
        entityName: null,
        value: newTripleOrdering.triple.value,
      }, spaceId);
      
      // Update the local indices map
      setRelationIndices(prev => ({
        ...prev,
        [item.relationId]: newTripleOrdering.triple.value.value
      }));
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">

      <Reorder.Group 
        as="span" 
        axis="x" 
        values={relationItems} 
        onReorder={handleReorder}
        className="flex flex-wrap gap-2 items-center"
      >
        {relationItems.map((r) => {
          const relationId = r.relationId;
          const relationName = r.valueName;
          const renderableType = r.type;
          const relationValue = r.value;

          if (renderableType === 'IMAGE' && r.placeholder === true) {
            return (
              <div key={`relation-upload-image-${relationId}`}>
                <PageImageField
                onImageChange={imageSrc => {
                  const { id: imageId, ops } = Image.make({ cid: imageSrc });
                  const [createRelationOp, setTripleOp] = ops;

                  if (createRelationOp.type === 'CREATE_RELATION') {
                    send({
                      type: 'UPSERT_RELATION',
                      payload: {
                        fromEntityId: createRelationOp.relation.fromEntity,
                        fromEntityName: name,
                        toEntityId: createRelationOp.relation.toEntity,
                        toEntityName: null,
                        typeOfId: createRelationOp.relation.type,
                        typeOfName: 'Types',
                      },
                    });
                  }

                  if (setTripleOp.type === 'SET_TRIPLE') {
                    DB.upsert(
                      {
                        value: {
                          type: 'URL',
                          value: setTripleOp.triple.value.value,
                        },
                        entityId: imageId,
                        attributeId: setTripleOp.triple.attribute,
                        entityName: null,
                        attributeName: 'Image URL',
                      },
                      spaceId
                    );

                    send({
                      type: 'UPSERT_RELATION',
                      payload: {
                        fromEntityId: id,
                        fromEntityName: name,
                        toEntityId: imageId,
                        toEntityName: null,
                        typeOfId: r.attributeId,
                        typeOfName: r.attributeName,
                        renderableType: 'IMAGE',
                        value: setTripleOp.triple.value.value,
                      },
                    });
                  }
                }}
                onImageRemove={() => console.log(`remove`)}
              />
            </div>
          );
        }

        if (renderableType === 'IMAGE') {
          return <ImageZoom key={`image-${relationId}-${relationValue}`} imageSrc={getImagePath(relationValue)} />;
        }

        if (renderableType === 'RELATION' && r.placeholder === true) {
          return (
            <div key={`relation-select-entity-${relationId}`} data-testid="select-entity" className="w-full">
              <SelectEntity
                key={JSON.stringify(relationValueTypes)}
                spaceId={spaceId}
                relationValueTypes={relationValueTypes ? relationValueTypes : undefined}
                onCreateEntity={result => {
                  if (property?.relationValueTypeId) {
                    send({
                      type: 'UPSERT_RELATION',
                      payload: {
                        fromEntityId: result.id,
                        fromEntityName: result.name,
                        toEntityId: property.relationValueTypeId,
                        toEntityName: property.relationValueTypeName ?? null,
                        typeOfId: SystemIds.TYPES_ATTRIBUTE,
                        typeOfName: 'Types',
                      },
                    });
                  }
                }}
                onDone={result => {
                  const newRelationId = ID.createEntityId();

                  const newRelation: StoreRelation = {
                    id: newRelationId,
                    space: spaceId,
                    index: INITIAL_RELATION_INDEX_VALUE,
                    typeOf: {
                      id: EntityId(r.attributeId),
                      name: r.attributeName,
                    },
                    fromEntity: {
                      id: EntityId(id),
                      name: name,
                    },
                    toEntity: {
                      id: EntityId(result.id),
                      name: result.name,
                      renderableType: 'RELATION',
                      value: EntityId(result.id),
                    },
                  };

                  DB.upsertRelation({
                    relation: newRelation,
                    spaceId,
                  });

                  if (result.space) {
                    DB.upsert(
                      {
                        attributeId: SystemIds.RELATION_TO_ATTRIBUTE,
                        attributeName: 'To Entity',
                        entityId: newRelationId,
                        entityName: null,
                        value: {
                          type: 'URL',
                          value: GraphUrl.fromEntityId(result.id, { spaceId: result.space }),
                        },
                      },
                      spaceId
                    );

                    if (result.verified) {
                      DB.upsert(
                        {
                          attributeId: SystemIds.VERIFIED_SOURCE_ATTRIBUTE,
                          attributeName: 'Verified Source',
                          entityId: newRelationId,
                          entityName: null,
                          value: {
                            type: 'CHECKBOX',
                            value: '1',
                          },
                        },
                        spaceId
                      );
                    }
                  }
                }}
                variant="fixed"
              />
              </div>
            );
          }
 
          return (
            <Reorder.Item
              drag
              key={relationId}
              value={r}
              as="span"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ 
                opacity: 1, 
                scale: 1,
                transition: { 
                  type: 'spring',
                  stiffness: 300, 
                  damping: 20 
                } 
              }}
              exit={{ opacity: 0, scale: 0.8 }}
              style={{ touchAction: 'none' }}
            >
                <LinkableRelationChip
                  isEditing
                  onDelete={() => {
                    send({
                      type: 'DELETE_RELATION',
                      payload: {
                        renderable: r,
                      },
                    });
                  }}
                  entityHref={NavUtils.toEntity(spaceId, relationValue ?? '')}
                  relationHref={NavUtils.toEntity(spaceId, relationId)}
                >
                  {relationName ?? relationValue}
                </LinkableRelationChip>
            </Reorder.Item>
          );
        })}
      </Reorder.Group>
      
      {!hasPlaceholders && typeOfRenderableType === 'RELATION' && (
        <div className="mt-1">
          <SelectEntityAsPopover
            key={JSON.stringify(relationValueTypes)}
            trigger={<SquareButton icon={<Create />} />}
            relationValueTypes={relationValueTypes ? relationValueTypes : undefined}
            onCreateEntity={result => {
              if (property?.relationValueTypeId) {
                send({
                  type: 'UPSERT_RELATION',
                  payload: {
                    fromEntityId: result.id,
                    fromEntityName: result.name,
                    toEntityId: property.relationValueTypeId,
                    toEntityName: property.relationValueTypeName ?? null,
                    typeOfId: SystemIds.TYPES_ATTRIBUTE,
                    typeOfName: 'Types',
                  },
                });
              }
            }}
            onDone={result => {
              const newRelationId = ID.createEntityId();

              const newRelation: StoreRelation = {
                id: newRelationId,
                space: spaceId,
                index: INITIAL_RELATION_INDEX_VALUE,
                typeOf: {
                  id: EntityId(typeOfId),
                  name: typeOfName,
                },
                fromEntity: {
                  id: EntityId(id),
                  name: name,
                },
                toEntity: {
                  id: EntityId(result.id),
                  name: result.name,
                  renderableType: 'RELATION',
                  value: EntityId(result.id),
                },
              };

              DB.upsertRelation({
                relation: newRelation,
                spaceId,
              });

              if (result.space) {
                DB.upsert(
                  {
                    attributeId: SystemIds.RELATION_TO_ATTRIBUTE,
                    attributeName: 'To Entity',
                    entityId: newRelationId,
                    entityName: null,
                    value: {
                      type: 'URL',
                      value: GraphUrl.fromEntityId(result.id, { spaceId: result.space }),
                    },
                  },
                  spaceId
                );

                if (result.verified) {
                  DB.upsert(
                    {
                      attributeId: SystemIds.VERIFIED_SOURCE_ATTRIBUTE,
                      attributeName: 'Verified Source',
                      entityId: newRelationId,
                      entityName: null,
                      value: {
                        type: 'CHECKBOX',
                        value: '1',
                      },
                    },
                    spaceId
                  );
                }
              }
            }}
            spaceId={spaceId}
          />
        </div>
      )}
    </div>
  );
}

type TriplesGroupProps = {
  triples: TripleRenderableProperty[];
};

function TriplesGroup({ triples }: TriplesGroupProps) {
  const { id, name, spaceId } = useEntityPageStore();

  const send = useEditEvents({
    context: {
      entityId: id,
      spaceId: spaceId,
      entityName: name ?? '',
    },
  });

  return (
    <div className="flex flex-wrap gap-2">
      {triples.map(renderable => {
        switch (renderable.type) {
          case 'TEXT': {
            return (
              <PageStringField
                key={renderable.attributeId}
                variant="body"
                placeholder="Add value..."
                aria-label="text-field"
                value={renderable.value}
                onChange={value => {
                  send({
                    type: 'UPSERT_RENDERABLE_TRIPLE_VALUE',
                    payload: {
                      renderable,
                      value: {
                        type: 'TEXT',
                        value: value,
                      },
                    },
                  });
                }}
              />
            );
          }
          case 'NUMBER':
            return (
              <NumberField
                value={renderable.value}
                format={renderable.options?.format}
                onChange={value =>
                  send({
                    type: 'UPSERT_RENDERABLE_TRIPLE_VALUE',
                    payload: {
                      renderable,
                      value: {
                        type: 'NUMBER',
                        value: value,
                        options: {
                          format: renderable.options?.format,
                        },
                      },
                    },
                  })
                }
              />
            );
          case 'CHECKBOX': {
            const checked = getChecked(renderable.value);

            return (
              <Checkbox
                key={`checkbox-${renderable.attributeId}-${renderable.value}`}
                checked={checked}
                onChange={() => {
                  send({
                    type: 'UPSERT_RENDERABLE_TRIPLE_VALUE',
                    payload: {
                      renderable,
                      value: {
                        type: 'CHECKBOX',
                        value: !checked ? '1' : '0',
                      },
                    },
                  });
                }}
              />
            );
          }
          case 'TIME': {
            return (
              <DateField
                onBlur={({ value, format }) =>
                  send({
                    type: 'UPSERT_RENDERABLE_TRIPLE_VALUE',
                    payload: {
                      value: {
                        value,
                        type: 'TIME',
                        options: {
                          format,
                        },
                      },
                      renderable,
                    },
                  })
                }
                key={renderable.attributeId}
                isEditing={true}
                value={renderable.value}
                format={renderable.options?.format}
              />
            );
          }

          case 'URL': {
            return (
              <WebUrlField
                key={renderable.attributeId}
                spaceId={spaceId}
                placeholder="Add a URI"
                isEditing={true}
                onBlur={event =>
                  send({
                    type: 'UPSERT_RENDERABLE_TRIPLE_VALUE',
                    payload: {
                      value: {
                        value: event.target.value,
                        type: 'URL',
                      },
                      renderable,
                    },
                  })
                }
                value={renderable.value}
              />
            );
          }
        }
      })}
    </div>
  );
}
