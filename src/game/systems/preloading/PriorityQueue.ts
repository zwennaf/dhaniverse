export interface QueueItem<T> {
  item: T;
  priority: number;
  timestamp: number;
}

export class PriorityQueue<T> {
  private items: QueueItem<T>[] = [];
  private maxSize: number;

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

  enqueue(item: T, priority: number): void {
    const queueItem: QueueItem<T> = {
      item,
      priority,
      timestamp: Date.now()
    };

    // Find insertion point (lower priority number = higher priority)
    let insertIndex = 0;
    while (
      insertIndex < this.items.length &&
      this.items[insertIndex].priority <= priority
    ) {
      insertIndex++;
    }

    this.items.splice(insertIndex, 0, queueItem);

    // Enforce max size
    if (this.items.length > this.maxSize) {
      this.items = this.items.slice(0, this.maxSize);
    }
  }

  dequeue(): T | null {
    const item = this.items.shift();
    return item ? item.item : null;
  }

  peek(): T | null {
    return this.items.length > 0 ? this.items[0].item : null;
  }

  remove(predicate: (item: T) => boolean): boolean {
    const index = this.items.findIndex(queueItem => predicate(queueItem.item));
    if (index !== -1) {
      this.items.splice(index, 1);
      return true;
    }
    return false;
  }

  contains(predicate: (item: T) => boolean): boolean {
    return this.items.some(queueItem => predicate(queueItem.item));
  }

  size(): number {
    return this.items.length;
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }

  clear(): void {
    this.items = [];
  }

  toArray(): T[] {
    return this.items.map(item => item.item);
  }

  // Remove items older than specified age (in milliseconds)
  removeStaleItems(maxAge: number): number {
    const now = Date.now();
    const originalLength = this.items.length;
    
    this.items = this.items.filter(item => (now - item.timestamp) <= maxAge);
    
    return originalLength - this.items.length;
  }

  // Get items by priority range
  getItemsByPriorityRange(minPriority: number, maxPriority: number): T[] {
    return this.items
      .filter(item => item.priority >= minPriority && item.priority <= maxPriority)
      .map(item => item.item);
  }
}