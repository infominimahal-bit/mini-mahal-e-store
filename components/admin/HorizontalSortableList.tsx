'use client';

import React, { useState, useCallback, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
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

  const style = {
    transform: transform ? CSS.Translate.toString(transform) : undefined,
    transition,
    zIndex: isDragging ? 9999 : undefined,
    position: isDragging ? 'relative' : undefined,
  } as React.CSSProperties;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center ${isDragging ? 'scale-105 shadow-md z-50' : ''}`}
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
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
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

  const itemIds = useMemo(
    () => items.map((item) => getId(item)),
    [items, getId]
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragEnd={handleDragEnd}
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
