import {
  closestCorners,
  DroppableContainer,
  getFirstCollision,
  KeyboardCode,
  KeyboardCoordinateGetter,
  UniqueIdentifier,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { FlattenedItem } from './treeUtils';

export type SensorContext<Item> = {
  current: {
    items: FlattenedItem<Item>[];
    offset: number;
  }
};

export function getProjection<Item>(
  items: FlattenedItem<Item>[],
  activeId: UniqueIdentifier,
  overId: UniqueIdentifier,
  dragOffset: number,
  indentationWidth: number,
  itemCanHave: (item: Item) => boolean
): { depth: number; maxDepth: number; minDepth: number; parentId: UniqueIdentifier | null; } {
  const overItemIndex = items.findIndex(({ id }) => id === overId);
  const activeItemIndex = items.findIndex(({ id }) => id === activeId);
  const activeItem = items[activeItemIndex];
  const newItems = arrayMove(items, activeItemIndex, overItemIndex);
  const previousItem = newItems[overItemIndex - 1];
  const nextItem = newItems[overItemIndex + 1];
  const dragDepth = getDragDepth(dragOffset, indentationWidth);
  const projectedDepth = activeItem.depth + dragDepth;
  const maxDepth = previousItem ? previousItem.depth + (itemCanHave(previousItem.value) ? 1 : 0) : 0;
  const minDepth = nextItem?.depth ?? 0;
  let depth = projectedDepth;

  if (projectedDepth >= maxDepth) {
    depth = maxDepth;
  } else if (projectedDepth < minDepth) {
    depth = minDepth;
  }

  return { depth, maxDepth, minDepth, parentId: getParentId() };

  function getParentId() {
    if (depth === 0 || !previousItem) {
      return null;
    }

    if (depth === previousItem.depth) {
      return previousItem.parentId;
    }

    if (depth > previousItem.depth) {
      return previousItem.id;
    }

    const newParent = newItems
      .slice(0, overItemIndex)
      .reverse()
      .find((item) => item.depth === depth)?.parentId;

    return newParent ?? null;
  }
}

// Keyboard Coordinates
const directions: string[] = [
  KeyboardCode.Down,
  KeyboardCode.Right,
  KeyboardCode.Up,
  KeyboardCode.Left,
];

const horizontal: string[] = [KeyboardCode.Left, KeyboardCode.Right];

export function sortableTreeKeyboardCoordinates<Item>(
  context: SensorContext<Item>,
  indicator: boolean,
  indentationWidth: number,
  itemCanHave: (item: Item) => boolean,
): KeyboardCoordinateGetter {
  return (
    event,
    {
      currentCoordinates,
      context: { active, over, collisionRect, droppableRects, droppableContainers },
    }
  ) => {
    if (directions.includes(event.code)) {
      if (!active || !collisionRect) {
        return;
      }

      event.preventDefault();

      const {
        current: { items, offset },
      } = context;

      if (horizontal.includes(event.code) && over?.id) {
        const { depth, maxDepth, minDepth } = getProjection(
          items,
          active.id,
          over.id,
          offset,
          indentationWidth,
          itemCanHave,
        );

        switch (event.code) {
          case KeyboardCode.Left:
            if (depth > minDepth) {
              return {
                ...currentCoordinates,
                x: currentCoordinates.x - indentationWidth,
              };
            }
            break;
          case KeyboardCode.Right:
            if (depth < maxDepth) {
              return {
                ...currentCoordinates,
                x: currentCoordinates.x + indentationWidth,
              };
            }
            break;
        }

        return undefined;
      }

      const containers: DroppableContainer[] = [];

      droppableContainers.forEach((container) => {
        if (container?.disabled || container.id === over?.id) {
          return;
        }

        const rect = droppableRects.get(container.id);

        if (!rect) {
          return;
        }

        switch (event.code) {
          case KeyboardCode.Down:
            if (collisionRect.top < rect.top) {
              containers.push(container);
            }
            break;
          case KeyboardCode.Up:
            if (collisionRect.top > rect.top) {
              containers.push(container);
            }
            break;
        }
      });

      const collisions = closestCorners({
        active,
        collisionRect,
        pointerCoordinates: null,
        droppableRects,
        droppableContainers: containers,
      });
      let closestId = getFirstCollision(collisions, 'id');

      if (closestId === over?.id && collisions.length > 1) {
        closestId = collisions[1].id;
      }

      if (closestId && over?.id) {
        const activeRect = droppableRects.get(active.id);
        const newRect = droppableRects.get(closestId);
        const newDroppable = droppableContainers.get(closestId);

        if (activeRect && newRect && newDroppable) {
          const newIndex = items.findIndex(({ id }) => id === closestId);
          const newItem = items[newIndex];
          const activeIndex = items.findIndex(({ id }) => id === active.id);
          const activeItem = items[activeIndex];

          if (newItem && activeItem) {
            const { depth } = getProjection(
              items,
              active.id,
              closestId,
              (newItem.depth - activeItem.depth) * indentationWidth,
              indentationWidth,
              itemCanHave,
            );
            const isBelow = newIndex > activeIndex;
            const modifier = isBelow ? 1 : -1;
            const offset = indicator
              ? (collisionRect.height - activeRect.height) / 2
              : 0;

            const newCoordinates = {
              x: newRect.left + depth * indentationWidth,
              y: newRect.top + modifier * offset,
            };

            return newCoordinates;
          }
        }
      }
    }

    return undefined;
  };
}

function getDragDepth(offset: number, indentationWidth: number) {
  return Math.round(offset / indentationWidth);
}
