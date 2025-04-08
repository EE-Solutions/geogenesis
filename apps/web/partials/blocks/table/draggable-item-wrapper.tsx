import * as React from 'react';
import { useState } from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { DragHandle } from '~/design-system/icons/drag-handle';
import { Button } from '~/design-system/button';
import { Text } from '~/design-system/text';
import { Input } from '~/design-system/input';

interface DraggableItemWrapperProps {
  children: React.ReactNode;
  isEditing: boolean;
  index: number;
  onReorder: (oldIndex: number, newIndex: number) => void;
  totalItems?: number;
}

export const DraggableItemWrapper: React.FC<DraggableItemWrapperProps> = ({
  children,
  isEditing,
  index,
  onReorder,
  totalItems = 0,
}) => {
  const [isHovering, setIsHovering] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [newPosition, setNewPosition] = useState(String(index + 1));

  const handleSavePosition = () => {
    const newPositionNum = parseInt(newPosition, 10);
    if (isNaN(newPositionNum) || newPositionNum <= 0) {
      return;
    }
    onReorder(index, newPositionNum - 1);
    setIsPopoverOpen(false);
  };

  // Update newPosition whenever index changes
  React.useEffect(() => {
    setNewPosition(String(index + 1));
  }, [index]);

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
        {/* Always reserve the space for the handle, but only show it on hover */}
        <div className="w-6 flex-shrink-0 flex items-center justify-center self-stretch">
          {(isHovering || isPopoverOpen) && (
            <PopoverPrimitive.Root open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
              <PopoverPrimitive.Trigger asChild>
                <button 
                  className="text-grey-04 hover:text-text cursor-move p-1"
                  type="button"
                  aria-label="Reorder item"
                >
                  <DragHandle />
                </button>
              </PopoverPrimitive.Trigger>
              <PopoverPrimitive.Portal>
                <PopoverPrimitive.Content
                  className="z-50 w-64 rounded-md border border-grey-02 bg-white p-1 shadow-md animate-in fade-in-80"
                  sideOffset={5}
                  align="start"
                > 
                  {/* Three outlined boxes layout */}
                  <div className="space-y-2">
                    {/* Box 1: Input */}
                    <div className="border border-grey-02 rounded-md p-2">
                      <input
                        className="w-full border-none outline-none"
                        type="number"
                        min="1"
                        max={totalItems || undefined}
                        value={newPosition}
                        onChange={(e) => setNewPosition(e.target.value)}
                        placeholder="Enter position"
                      />
                    </div>
                    
                    {/* Box 2: Move button */}
                    {/* <div className="border border-grey-02 rounded-md p-2"> */}
                      <Button 
                        onClick={handleSavePosition}
                        variant="secondary"
                        className="w-full"
                      >
                        Move
                      </Button>
                    {/* </div> */}
                    
                    {/* Box 3: Position indicator */}
                    <div className="border border-grey-02 rounded-md p-2 text-center">
                      <Text variant="metadataMedium" color="grey-04">
                        Current Position {index + 1}{totalItems > 0 ? `/${totalItems}` : ''}
                      </Text>
                    </div>
                  </div>
                  
                  <PopoverPrimitive.Arrow className="fill-grey-02" />
                </PopoverPrimitive.Content>
              </PopoverPrimitive.Portal>
            </PopoverPrimitive.Root>
          )}
        </div>
        <div className="flex-1">
          {children}
        </div>
      </div>
    </div>
  );
};
