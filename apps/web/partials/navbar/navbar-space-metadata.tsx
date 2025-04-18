'use client';

import { useParams } from 'next/navigation';

import { useSpace } from '~/core/hooks/use-space';
import type { EntityId, SpaceId } from '~/core/io/schema';

import { ChevronRight } from '~/design-system/icons/chevron-right';

import { NavbarBreadcrumb } from './navbar-breadcrumb';
import { NavbarLinkMenu } from './navbar-link-menu';

export function NavbarSpaceMetadata() {
  const params = useParams();

  const spaceId: SpaceId | undefined = params?.['id'] as SpaceId | undefined;
  const entityId: EntityId | undefined = params?.['entityId'] as EntityId | undefined;

  const { space } = useSpace(spaceId ?? '');

  return (
    <div className="flex items-center gap-2">
      <NavbarLinkMenu />
      {spaceId && (
        <>
          <ChevronRight color="grey-03" />
          <NavbarBreadcrumb spaceId={spaceId} entityId={entityId ?? (space?.spaceConfig?.id as EntityId) ?? ''} />
        </>
      )}
    </div>
  );
}
