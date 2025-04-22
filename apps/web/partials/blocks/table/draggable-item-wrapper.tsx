import * as React from 'react';
import { useState } from 'react';
import { DragHandle } from '~/design-system/icons/drag-handle';

interface DraggableItemWrapperProps {
  children: React.ReactNode;
  isEditing: boolean;
}

export const DraggableItemWrapper: React.FC<DraggableItemWrapperProps> = ({
  children,
  isEditing,
}) => {
  const [isHovering, setIsHovering] = useState(false);

  if (!isEditing) {
    return <>{children}</>;
  }

  return (
    <div 
      className="relative flex items-center group"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div className="flex w-full items-center">
        <div className="w-6 flex-shrink-0 flex items-center justify-center self-stretch">
          {isHovering && (
            <span className="text-grey-04 hover:text-text p-1">
              <DragHandle />
            </span>
          )}
        </div>
        <div className="flex-1">
          {children}
        </div>
      </div>
    </div>
  );
};
