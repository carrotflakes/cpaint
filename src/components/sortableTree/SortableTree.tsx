import {
  closestCenter,
  defaultDropAnimation,
  DndContext,
  DragEndEvent,
  DragMoveEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  DropAnimation,
  KeyboardSensor,
  MeasuringStrategy,
  Modifier,
  PointerSensor,
  UniqueIdentifier,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  AnimateLayoutChanges,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import React, {
  CSSProperties,
  HTMLAttributes,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { getProjection, sortableTreeKeyboardCoordinates } from "./dragUtils";
import { FlattenedItem, getChildCount } from "./treeUtils";

// TreeItem Component
export interface TreeItemProps<Item, Extra>
  extends Omit<HTMLAttributes<HTMLDivElement>, "id"> {
  childCount?: number;
  clone?: boolean;
  collapsed?: boolean;
  depth: number;
  disableInteraction?: boolean;
  ghost?: boolean;
  handleProps?: any;
  indicator?: boolean;
  indentationWidth: number;
  value: Item;
  extra: Extra;
  wrapperRef?(node: HTMLDivElement): void;
}

const measuring = {
  droppable: {
    strategy: MeasuringStrategy.Always,
  },
};

const dropAnimationConfig: DropAnimation = {
  keyframes({ transform }) {
    return [
      { opacity: 1, transform: CSS.Transform.toString(transform.initial) },
      {
        opacity: 0,
        transform: CSS.Transform.toString({
          ...transform.final,
          x: transform.final.x + 5,
          y: transform.final.y + 5,
        }),
      },
    ];
  },
  easing: "ease-out",
  sideEffects({ active }) {
    active.node.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: defaultDropAnimation.duration,
      easing: defaultDropAnimation.easing,
    });
  },
};

interface SortableTreeProps<Item, Extra> {
  Item: React.ForwardRefExoticComponent<
    TreeItemProps<Item, Extra> & React.RefAttributes<HTMLDivElement>
  >;
  items: readonly Item[];
  itemToId: (item: Item) => UniqueIdentifier;
  itemToChildren: (item: Item) => readonly Item[];
  itemToCollapsed: (item: Item) => boolean;
  itemCanHave: (item: Item) => boolean;
  itemsInverted?: boolean;
  indentationWidth?: number;
  offsetY?: number;
  extra: Extra;
  onItemMove?: (
    fromId: UniqueIdentifier,
    parentId: UniqueIdentifier | null,
    toIndex: number
  ) => void;
  onItemRemove?: (id: UniqueIdentifier) => void;
  onItemCollapse?: (id: UniqueIdentifier) => void;
}

export function SortableTree<Item, Extra>({
  Item,
  items,
  itemToId,
  itemToChildren,
  itemToCollapsed,
  itemCanHave,
  itemsInverted = false,
  indentationWidth = 50,
  offsetY = 25,
  extra,
  onItemMove,
}: SortableTreeProps<Item, Extra>) {
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [overId, setOverId] = useState<UniqueIdentifier | null>(null);
  const [offsetLeft, setOffsetLeft] = useState(0);

  const flattenedItems = useMemo(() => {
    function flatten(
      items: readonly Item[],
      parentId: UniqueIdentifier | null = null,
      depth = 0
    ): FlattenedItem<Item>[] {
      if (itemsInverted) {
        items = items.toReversed();
      }
      return items.flatMap<FlattenedItem<Item>>((item) => {
        const hidden = itemToCollapsed(item) || itemToId(item) === activeId;
        return [
          {
            id: itemToId(item),
            parentId,
            depth,
            value: item,
          },
          ...(hidden
            ? []
            : flatten(itemToChildren(item), itemToId(item), depth + 1)),
        ];
      });
    }

    return flatten(items);
  }, [items, itemToId, itemToChildren, itemToCollapsed, activeId]);

  const projected =
    activeId && overId
      ? getProjection(
          flattenedItems,
          activeId,
          overId,
          offsetLeft,
          indentationWidth,
          itemCanHave
        )
      : null;

  const sensorContext = useRef({
    items: flattenedItems,
    offset: offsetLeft,
  });

  const [coordinateGetter] = useState(() =>
    sortableTreeKeyboardCoordinates(
      sensorContext,
      true,
      indentationWidth,
      itemCanHave
    )
  );

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter,
    })
  );

  const sortedIds = useMemo(
    () => flattenedItems.map(({ id }) => id),
    [flattenedItems]
  );

  const activeItem = activeId
    ? flattenedItems.find(({ id }) => id === activeId)
    : null;

  useEffect(() => {
    sensorContext.current = {
      items: flattenedItems,
      offset: offsetLeft,
    };
  }, [flattenedItems, offsetLeft]);

  const adjustTranslate: Modifier = useMemo(
    () =>
      ({ transform }) => {
        return {
          ...transform,
          y: transform.y - offsetY,
        };
      },
    [offsetY]
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      measuring={measuring}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext items={sortedIds} strategy={verticalListSortingStrategy}>
        {flattenedItems.map(({ id, depth, value }) => {
          return (
            <SortableTreeItem
              key={id}
              Item={Item}
              id={id}
              value={value}
              depth={id === activeId && projected ? projected.depth : depth}
              indentationWidth={indentationWidth}
              indicator={true}
              collapsed={itemToCollapsed(value)}
              extra={extra}
            />
          );
        })}
        {createPortal(
          <DragOverlay
            dropAnimation={dropAnimationConfig}
            modifiers={[adjustTranslate]}
          >
            {activeId && activeItem ? (
              <SortableTreeItem
                id={activeId}
                Item={Item}
                depth={activeItem.depth}
                clone
                childCount={getChildCount(activeItem.value, itemToChildren) + 1}
                value={activeItem.value}
                indentationWidth={indentationWidth}
                extra={extra}
              />
            ) : null}
          </DragOverlay>,
          document.body
        )}
      </SortableContext>
    </DndContext>
  );

  function handleDragStart({ active: { id: activeId } }: DragStartEvent) {
    setActiveId(activeId);
    setOverId(activeId);

    document.body.style.setProperty("cursor", "grabbing");
  }

  function handleDragMove({ delta }: DragMoveEvent) {
    setOffsetLeft(delta.x);
  }

  function handleDragOver({ over }: DragOverEvent) {
    setOverId(over?.id ?? null);
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    resetState();

    // TODO: Do not allow moving into itself
    if (projected && over && onItemMove) {
      const { depth, parentId } = projected;

      const fromId = active.id;
      let toId = over.id;
      const fromI = flattenedItems.findIndex(({ id }) => id === fromId)!;
      let toI = flattenedItems.findIndex(({ id }) => id === toId)!;
      const children = parentId
        ? itemToChildren(
            flattenedItems.find(({ id }) => id === parentId)!.value
          )
        : items;
      let toIndex = itemsInverted ? children.length : 0;

      if (fromI >= toI) toI -= 1;
      for (let i = toI; 0 <= i; i--) {
        const id = flattenedItems[i].id;
        if (flattenedItems[i].depth === depth) {
          toIndex =
            children.findIndex((item) => itemToId(item) === id) +
            (itemsInverted ? 0 : 1);
          break;
        } else if (flattenedItems[i].depth < depth) {
          break;
        }
      }
      onItemMove(fromId, parentId, toIndex);
    }
  }

  function handleDragCancel() {
    resetState();
  }

  function resetState() {
    setOverId(null);
    setActiveId(null);
    setOffsetLeft(0);

    document.body.style.setProperty("cursor", "");
  }
}

// SortableTreeItem Component
interface SortableTreeItemProps<Item, Extra>
  extends TreeItemProps<Item, Extra> {
  id: UniqueIdentifier;
  Item: React.ForwardRefExoticComponent<
    TreeItemProps<Item, Extra> & React.RefAttributes<HTMLDivElement>
  >;
}

const animateLayoutChanges: AnimateLayoutChanges = ({
  isSorting,
  wasDragging,
}) => (isSorting || wasDragging ? false : true);

function SortableTreeItem<Item, Extra>({
  id,
  Item,
  depth,
  ...props
}: SortableTreeItemProps<Item, Extra>) {
  const {
    attributes,
    isDragging,
    isSorting,
    listeners,
    setDraggableNodeRef,
    setDroppableNodeRef,
    transform,
    transition,
  } = useSortable({
    id,
    animateLayoutChanges,
  });
  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  return (
    <Item
      ref={setDraggableNodeRef}
      wrapperRef={setDroppableNodeRef}
      style={style}
      depth={depth}
      ghost={isDragging}
      disableInteraction={isSorting}
      handleProps={{
        ...attributes,
        ...listeners,
      }}
      {...props}
    />
  );
}
