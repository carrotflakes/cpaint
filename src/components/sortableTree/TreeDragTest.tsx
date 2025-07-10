// see https://github.com/clauderic/dnd-kit/tree/master/stories/3%20-%20Examples/Tree

import { UniqueIdentifier } from "@dnd-kit/core";
import React, {
  forwardRef,
  HTMLAttributes,
  useState
} from "react";
import { SortableTree } from "./SortableTree";
import { type FlattenedItem } from "./treeUtils";

// TreeItem Component
interface TreeItemProps extends Omit<HTMLAttributes<HTMLDivElement>, "id"> {
  childCount?: number;
  clone?: boolean;
  collapsed?: boolean;
  depth: number;
  disableInteraction?: boolean;
  ghost?: boolean;
  handleProps?: any;
  indicator?: boolean;
  indentationWidth: number;
  value: TreeItem;
  extra: {
    handleItemRemove: (id: UniqueIdentifier) => void;
    handleItemCollapse: (id: UniqueIdentifier) => void;
  };
  wrapperRef?(node: HTMLDivElement): void;
}

const TreeItem = forwardRef<HTMLDivElement, TreeItemProps>(
  (
    {
      childCount,
      clone,
      depth,
      disableInteraction,
      ghost,
      handleProps,
      indentationWidth,
      indicator,
      collapsed,
      extra: { handleItemRemove, handleItemCollapse },
      style,
      value,
      wrapperRef,
      ...props
    },
    ref
  ) => {
    return (
      <div
        className={classNames(
          "tree-wrapper",
          clone && "clone",
          ghost && "ghost",
          indicator && "indicator",
          disableInteraction && "disable-interaction"
        )}
        ref={wrapperRef}
        style={
          {
            "--spacing": `${indentationWidth * depth}px`,
          } as React.CSSProperties
        }
        {...props}
      >
        <div className="tree-item" ref={ref} style={style}>
          <div className="handle" {...handleProps}>
            <svg width="12" height="16" viewBox="0 0 20 20" fill="currentColor">
              <path d="M7 2a2 2 0 1 1 .001 4.001A2 2 0 0 1 7 2zm0 6a2 2 0 1 1 .001 4.001A2 2 0 0 1 7 8zm0 6a2 2 0 1 1 .001 4.001A2 2 0 0 1 7 14zm6-8a2 2 0 1 1-.001-4.001A2 2 0 0 1 13 6zm0 2a2 2 0 1 1 .001 4.001A2 2 0 0 1 13 8zm0 6a2 2 0 1 1 .001 4.001A2 2 0 0 1 13 14z" />
            </svg>
          </div>
          {handleItemCollapse && value.children.length > 0 && (
            <button
              onClick={() => handleItemCollapse(value.id)}
              className={classNames(
                "collapse-button",
                collapsed && "collapsed"
              )}
              type="button"
            >
              <svg
                width="10"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 70 41"
              >
                <path d="M30.76 39.2402C31.885 40.3638 33.41 40.995 35 40.995C36.59 40.995 38.115 40.3638 39.24 39.2402L68.24 10.2402C69.2998 9.10284 69.8768 7.59846 69.8494 6.04406C69.822 4.48965 69.1923 3.00657 68.093 1.90726C66.9937 0.807959 65.5106 0.178263 63.9562 0.150837C62.4018 0.123411 60.8974 0.700397 59.76 1.76024L35 26.5102L10.24 1.76024C9.10259 0.700397 7.59822 0.123411 6.04382 0.150837C4.48941 0.178263 3.00633 0.807959 1.90702 1.90726C0.807717 3.00657 0.178021 4.48965 0.150595 6.04406C0.123169 7.59846 0.700155 9.10284 1.75999 10.2402L30.76 39.2402Z" />
              </svg>
            </button>
          )}
          <span className="text">{value.id}</span>
          {!clone && handleItemRemove && (
            <button
              onClick={() => handleItemRemove(value.id)}
              className="remove-button"
            >
              ✕
            </button>
          )}
          {clone && childCount && childCount > 1 ? (
            <span className="count">{childCount}</span>
          ) : null}
        </div>
      </div>
    );
  }
);

const initialItems: TreeItems = [
  {
    id: "Home",
    children: [],
  },
  {
    id: "Collections",
    children: [
      { id: "Spring", children: [] },
      { id: "Summer", children: [] },
      { id: "Fall", children: [] },
      { id: "Winter", children: [] },
    ],
    collapsed: true, // 初期状態で折りたたみ
  },
  {
    id: "About Us",
    children: [],
  },
  {
    id: "My Account",
    children: [
      { id: "Addresses", children: [] },
      { id: "Order History", children: [] },
    ],
    collapsed: false, // 初期状態で展開
  },
];

// Demo Components
export default function TreeDragTest() {
  const [items, setItems] = useState<TreeItems>(initialItems);

  const handleItemMove = (
    activeId: UniqueIdentifier,
    parentId: UniqueIdentifier | null,
    toIndex: number
  ) => {
    setItems((currentItems) => {
      const activeItem = findItemDeep(currentItems, activeId)!;
      const newItem = { ...activeItem };
      let children = parentId
        ? findItemDeep(currentItems, parentId)!.children
        : currentItems;

      const activeIndex = children.findIndex((item) => item.id === activeId);

      currentItems = removeItem(currentItems, activeId);
      if (activeIndex !== -1 && activeIndex < toIndex) toIndex--;

      children = parentId
        ? findItemDeep(currentItems, parentId)!.children
        : currentItems;
      children.splice(toIndex, 0, newItem);

      return currentItems;
    });
  };

  const handleItemRemove = (id: UniqueIdentifier) => {
    setItems((currentItems) => removeItem(currentItems, id));
  };

  const handleItemCollapse = (id: UniqueIdentifier) => {
    console.log("Collapsing/expanding item:", id);
    setItems((currentItems) => {
      const newItems = setProperty(currentItems, id, "collapsed", (value) => {
        console.log(
          `Item ${id}: current collapsed state = ${value}, new state = ${!value}`
        );
        return !value;
      });
      console.log("Updated items:", newItems);
      return newItems;
    });
  };

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Sortable Tree Examples</h1>

      <div className="space-y-8">
        <div>
          <h2 className="text-lg font-semibold mb-4">All Features</h2>
          <SortableTree
            Item={TreeItem}
            items={items}
            itemToId={(item) => item.id}
            itemToChildren={(item) => item.children}
            itemToCollapsed={(item) => item.collapsed ?? false}
            itemCanHave={() => true}
            onItemMove={handleItemMove}
            extra={{ handleItemRemove, handleItemCollapse }}
          />
        </div>
      </div>

      <style>{`
        .sortable-tree {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .tree-wrapper {
          list-style: none;
          box-sizing: border-box;
          padding-left: var(--spacing);
          margin-bottom: -1px;
        }

        .tree-wrapper.clone {
          display: inline-block;
          pointer-events: none;
          padding: 0;
          padding-left: 10px;
          padding-top: 5px;
        }

        .tree-wrapper.clone .tree-item {
          --vertical-padding: 5px;
          padding-right: 24px;
          border-radius: 4px;
          box-shadow: 0px 15px 15px 0 rgba(34, 33, 81, 0.1);
        }

        .tree-wrapper.ghost.indicator {
          opacity: 1;
          position: relative;
          z-index: 1;
          margin-bottom: -1px;
        }

        .tree-wrapper.ghost.indicator .tree-item {
          position: relative;
          padding: 0;
          height: 8px;
          border-color: #2389ff;
          background-color: #56a1f8;
        }

        .tree-wrapper.ghost.indicator .tree-item:before {
          position: absolute;
          left: -8px;
          top: -4px;
          display: block;
          content: '';
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: 1px solid #2389ff;
          background-color: #ffffff;
        }

        .tree-wrapper.ghost.indicator .tree-item > * {
          opacity: 0;
          height: 0;
        }

        .tree-wrapper.ghost:not(.indicator) {
          opacity: 0.5;
        }

        .tree-wrapper.ghost .tree-item > * {
          box-shadow: none;
          background-color: transparent;
        }

        .tree-item {
          --vertical-padding: 10px;
          position: relative;
          display: flex;
          align-items: center;
          padding: var(--vertical-padding) 10px;
          background-color: #fff;
          border: 1px solid #dedede;
          color: #222;
          box-sizing: border-box;
        }

        .handle {
          display: flex;
          width: 12px;
          padding: 15px;
          align-items: center;
          justify-content: center;
          flex: 0 0 auto;
          touch-action: none;
          cursor: var(--cursor, grab);
          border-radius: 5px;
          color: #919eab;
          transition: color 250ms ease;
        }

        .handle:hover {
          color: #6f7b88;
        }

        .handle:focus {
          outline: none;
          color: #1976d2;
        }

        .handle svg {
          flex: 0 0 auto;
          margin: auto;
          height: 100%;
          overflow: visible;
          fill: currentColor;
        }

        .text {
          flex-grow: 1;
          padding-left: 0.5rem;
          white-space: nowrap;
          text-overflow: ellipsis;
          overflow: hidden;
        }

        .count {
          position: absolute;
          top: -10px;
          right: -10px;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background-color: #2389ff;
          font-size: 0.8rem;
          font-weight: 600;
          color: #fff;
        }

        .collapse-button {
          display: flex;
          width: 16px;
          height: 16px;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #6f7b88;
          border: none;
          background: none;
          margin-right: 8px;
        }

        .collapse-button svg {
          transition: transform 250ms ease;
        }

        .collapse-button.collapsed svg {
          transform: rotate(-90deg);
        }

        .remove-button {
          width: 24px;
          height: 24px;
          cursor: pointer;
          color: #919eab;
          border: none;
          background: none;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          transition: color 250ms ease, background-color 250ms ease;
        }

        .remove-button:hover {
          color: #f44336;
          background-color: rgba(244, 67, 54, 0.1);
        }

        .disable-interaction {
          pointer-events: none;
        }

        .clone {
          user-select: none;
          -webkit-user-select: none;
        }

        .clone .text,
        .clone .count {
          user-select: none;
          -webkit-user-select: none;
        }
      `}</style>
    </div>
  );
}

export interface TreeItem {
  id: UniqueIdentifier;
  children: TreeItem[];
  collapsed?: boolean;
}

export type TreeItems = TreeItem[];

function flatten(
  items: TreeItems,
  parentId: UniqueIdentifier | null = null,
  depth = 0
): FlattenedItem<TreeItem>[] {
  return items.reduce<FlattenedItem<TreeItem>[]>((acc, item) => {
    return [
      ...acc,
      { id: item.id, parentId, depth, value: item },
      ...flatten(item.children, item.id, depth + 1),
    ];
  }, []);
}

export function flattenTree(items: TreeItems): FlattenedItem<TreeItem>[] {
  return flatten(items);
}

export function buildTree(
  flattenedItems: FlattenedItem<TreeItem>[]
): TreeItems {
  const root: TreeItem = { id: "root", children: [] };
  const nodes: Record<string, TreeItem> = { [root.id]: root };
  const items = flattenedItems.map((item) => ({
    ...item,
    children: [] as TreeItem[],
  }));

  for (const item of items) {
    const {
      id,
      children,
      value: { collapsed },
    } = item;
    const parentId = item.parentId ?? root.id;
    const parent = nodes[parentId] ?? findItem(items, parentId);

    const treeItem: TreeItem = {
      id,
      children,
      ...(collapsed !== undefined && { collapsed }),
    };
    nodes[id] = treeItem;
    parent.children.push(treeItem);
  }

  return root.children;
}

export function findItem(items: TreeItem[], itemId: UniqueIdentifier) {
  return items.find(({ id }) => id === itemId);
}

export function findItemDeep(
  items: TreeItems,
  itemId: UniqueIdentifier
): TreeItem | undefined {
  for (const item of items) {
    const { id, children } = item;

    if (id === itemId) {
      return item;
    }

    if (children.length) {
      const child = findItemDeep(children, itemId);

      if (child) {
        return child;
      }
    }
  }

  return undefined;
}

export function removeItem(items: TreeItems, id: UniqueIdentifier): TreeItems {
  return items
    .filter((item) => item.id !== id)
    .map((item) => ({
      ...item,
      children: item.children.length
        ? removeItem(item.children, id)
        : item.children,
    }));
}

export function setProperty<T extends keyof TreeItem>(
  items: TreeItems,
  id: UniqueIdentifier,
  property: T,
  setter: (value: TreeItem[T]) => TreeItem[T]
): TreeItems {
  return items.map((item) => {
    if (item.id === id) {
      return {
        ...item,
        [property]: setter(item[property]),
      };
    }

    if (item.children.length) {
      return {
        ...item,
        children: setProperty(item.children, id, property, setter),
      };
    }

    return item;
  });
}

// Simple classNames utility function
export function classNames(
  ...classes: (string | boolean | undefined)[]
): string {
  return classes.filter(Boolean).join(" ");
}
