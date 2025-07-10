import { UniqueIdentifier } from '@dnd-kit/core';

export interface FlattenedItem<Item> {
  id: UniqueIdentifier;
  parentId: UniqueIdentifier | null;
  depth: number;
  value: Item;
}


export function getChildCount<Item>(
  item: Item,
  itemToChildren: (item: Item) => readonly Item[]
): number {
  const children = itemToChildren(item);
  return children.reduce((count, child) => count + getChildCount(child, itemToChildren), children.length);
}
