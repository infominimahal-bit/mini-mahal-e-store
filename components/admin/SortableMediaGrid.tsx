'use client';

import React, { useState, useCallback, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
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
import { Save, AlertTriangle, X } from '@/components/common/Icons';

interface SortableItem {
  id: string;
  [key: string]: any;
}

interface SortableMediaGridProps<T extends SortableItem> {
  items: T[];
  onItemsReorder: (items: T[]) => void;
  onSave: (orderedIds: string[]) => Promise<void>;
  renderItem: (item: T, isSelected: boolean, onToggle: () => void) => React.ReactNode;
  getItemId?: (item: T) => string;
  isSelected?: (item: T) => boolean;
  onToggle?: (item: T) => void;
  columns?: string;
  saving?: boolean;
}

function SortableCard<T extends SortableItem>({
  item,
  renderItem,
  isSelected,
  onToggle,
  dragHandleProps,
}: {
  item: T;
  renderItem: (item: T, isSelected: boolean, onToggle: () => void) => React.ReactNode;
  isSelected: boolean;
  onToggle: () => void;
  dragHandleProps?: any;
}) {
  return (
    <div className="relative" {...dragHandleProps}>
      {renderItem(item, isSelected, onToggle)}
    </div>
  );
}

function DraggableMediaCard<T extends SortableItem>({
  item,
  renderItem,
  isSelected,
  onToggle,
}: {
  item: T;
  renderItem: (item: T, isSelected: boolean, onToggle: () => void) => React.ReactNode;
  isSelected: boolean;
  onToggle: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : 'auto' as const,
  };

  const dragHandleProps = {
    ref: setNodeRef,
    style,
    ...attributes,
    ...listeners,
  };

  return (
    <SortableCard
      item={item}
      renderItem={renderItem}
      isSelected={isSelected}
      onToggle={onToggle}
      dragHandleProps={dragHandleProps}
    />
  );
}

export default function SortableMediaGrid<T extends SortableItem>({
  items,
  onItemsReorder,
  onSave,
  renderItem,
  getItemId = (item) => item.id,
  isSelected = () => false,
  onToggle = () => {},
  columns = 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5',
  saving = false,
}: SortableMediaGridProps<T>) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [localItems, setLocalItems] = useState<T[]>(items);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [initialOrder, setInitialOrder] = useState<string[]>(() =>
    items.map((item) => getItemId(item))
  );

  React.useEffect(() => {
    if (!hasUnsavedChanges) {
      setLocalItems(items);
      setInitialOrder(items.map((item) => getItemId(item)));
    }
  }, [items, hasUnsavedChanges]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  );

  const activeItem = useMemo(
    () => localItems.find((item) => getItemId(item) === activeId),
    [activeId, localItems, getItemId]
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null);
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      setLocalItems((prev) => {
        const oldIndex = prev.findIndex((item) => getItemId(item) === active.id);
        const newIndex = prev.findIndex((item) => getItemId(item) === over.id);
        if (oldIndex === -1 || newIndex === -1) return prev;

        const updated = arrayMove(prev, oldIndex, newIndex);
        onItemsReorder(updated);
        setHasUnsavedChanges(true);
        return updated;
      });
    },
    [onItemsReorder, getItemId]
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  const handleDiscard = useCallback(() => {
    setHasUnsavedChanges(false);
    setLocalItems(items);
    onItemsReorder(items);
  }, [items, onItemsReorder]);

  const handleSave = useCallback(async () => {
    if (!hasUnsavedChanges) return;
    const orderedIds = localItems.map((item) => getItemId(item));
    await onSave(orderedIds);
    setHasUnsavedChanges(false);
  }, [hasUnsavedChanges, localItems, onSave, getItemId]);

  const itemIds = useMemo(
    () => localItems.map((item) => getItemId(item)),
    [localItems, getItemId]
  );

  return (
    <div className="space-y-4">
      {hasUnsavedChanges && (
        <div className="flex items-center justify-between gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 rounded-2xl">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/40">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <span className="text-sm font-bold text-amber-800 dark:text-amber-300">
                Unsorted Sorting Changes
              </span>
              <p className="text-xs text-amber-600/70 dark:text-amber-400/60">
                Drag to reorder images. Save to persist changes.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDiscard}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer min-h-[36px] transition-all disabled:opacity-50"
            >
              <X className="w-3.5 h-3.5" />
              Discard
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-sm cursor-pointer min-h-[36px] transition-all disabled:opacity-50"
            >
              {saving ? (
                <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              {saving ? 'Saving...' : 'Save Order'}
            </button>
          </div>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext items={itemIds} strategy={rectSortingStrategy}>
          <div className={`grid ${columns} gap-4`}>
            {localItems.map((item) => (
              <DraggableMediaCard
                key={getItemId(item)}
                item={item}
                renderItem={renderItem}
                isSelected={isSelected(item)}
                onToggle={() => onToggle(item)}
              />
            ))}
          </div>
        </SortableContext>

        <DragOverlay dropAnimation={null} zIndex={999999}>
          {activeItem ? (
            <div className="rotate-3 scale-105 shadow-2xl opacity-90">
              {renderItem(
                activeItem,
                isSelected(activeItem),
                () => onToggle(activeItem)
              )}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function arrayMove<T>(arr: T[], fromIndex: number, toIndex: number): T[] {
  if (fromIndex === toIndex) return arr;
  const newArr = [...arr];
  const [moved] = newArr.splice(fromIndex, 1);
  newArr.splice(toIndex, 0, moved);
  return newArr;
}
