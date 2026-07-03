'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableItem {
  id: string;
  [key: string]: any;
}

interface HorizontalSortableListProps<T extends SortableItem> {
  items: T[];
  onReorder: (items: T[]) => void;
  renderItem: (item: T, index: number, isDragging?: boolean) => React.ReactNode;
  getId?: (item: T) => string;
  className?: string;
}

function DraggablePill<T extends SortableItem>({
  item,
  renderItem,
  index,
  getId,
}: {
  item: T;
  renderItem: (item: T, index: number, isDragging?: boolean) => React.ReactNode;
  index: number;
  getId: (item: T) => string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: getId(item) });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center"
      {...attributes}
      {...listeners}
    >
      {renderItem(item, index, isDragging)}
    </div>
  );
}

export default function HorizontalSortableList<T extends SortableItem>({
  items,
  onReorder,
  renderItem,
  getId = (item) => item.id,
  className = 'flex flex-wrap gap-1.5 min-h-[28px]',
}: HorizontalSortableListProps<T>) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPortalTarget(document.body);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    })
  );

  const activeItem = useMemo(
    () => items.find((item) => getId(item) === activeId),
    [activeId, items, getId]
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null);
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = items.findIndex((item) => getId(item) === active.id);
      const newIndex = items.findIndex((item) => getId(item) === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(items, oldIndex, newIndex);
      onReorder(reordered);
    },
    [items, onReorder, getId]
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  const itemIds = useMemo(
    () => items.map((item) => getId(item)),
    [items, getId]
  );

  const overlayContent = (
    <DragOverlay dropAnimation={null} zIndex={999999}>
      {activeItem ? (
        <div
          className="flex items-center gap-1 px-2.5 py-1 rounded-full border-2 border-[#e94560] bg-white dark:bg-[#16162a] text-xs font-semibold shadow-2xl cursor-grabbing"
          style={{ pointerEvents: 'none' }}
        >
          {renderItem(activeItem, items.findIndex((i) => getId(i) === activeId), true)}
        </div>
      ) : null}
    </DragOverlay>
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext items={itemIds} strategy={rectSortingStrategy}>
        <div className={className}>
          {items.map((item, index) => (
            <DraggablePill
              key={getId(item)}
              item={item}
              renderItem={renderItem}
              index={index}
              getId={getId}
            />
          ))}
        </div>
      </SortableContext>

      {portalTarget ? createPortal(overlayContent, portalTarget) : null}
    </DndContext>
  );
}

function arrayMove<T>(arr: T[], fromIndex: number, toIndex: number): T[] {
  if (fromIndex === toIndex) return arr;
  const newArr = [...arr];
  const [moved] = newArr.splice(fromIndex, 1);
  newArr.splice(toIndex, 0, moved);
  return newArr;
}
