import { TreeRepository } from '../repositories';

export class TimelineService {
  constructor(private treeRepo: TreeRepository) {}

  addTimelineEvent(treeId: string, nodeId: string, timelineEvent: any) {
    if (!timelineEvent) return;

    const treeData = this.treeRepo.getTreeData(treeId);
    if (!treeData) return;

    treeData.timeline = treeData.timeline || [];
    treeData.timeline.push({
      date: new Date().toISOString(),
      ...timelineEvent,
      nodeId
    });

    this.treeRepo.updateTreeData(treeId, treeData);
  }
}