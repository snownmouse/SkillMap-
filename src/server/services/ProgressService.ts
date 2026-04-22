import { TreeRepository } from '../repositories';

export class ProgressService {
  constructor(private treeRepo: TreeRepository) {}

  updateProgress(treeId: string, nodeId: string, progressUpdate: any) {
    if (!progressUpdate) return;

    const treeData = this.treeRepo.getTreeData(treeId);
    if (!treeData || !treeData.nodes[nodeId]) return;

    const currentProgress = treeData.nodes[nodeId].progress || 0;
    const newProgress = Math.min(100, Math.max(0, progressUpdate.new_progress));
    const confidence = progressUpdate.confidence || 'medium';

    const finalProgress = this.applyProgressiveUpdate(currentProgress, newProgress, confidence);
    treeData.nodes[nodeId].progress = finalProgress;

    if (finalProgress === 100) {
      treeData.nodes[nodeId].status = 'completed';
    } else if (finalProgress > 0) {
      treeData.nodes[nodeId].status = 'in_progress';
    }

    this.treeRepo.updateTreeData(treeId, treeData);
  }

  private applyProgressiveUpdate(current: number, newProgress: number, confidence: string): number {
    const maxIncrement = confidence === 'high' ? 15 : confidence === 'medium' ? 10 : 5;

    if (newProgress <= current) {
      return newProgress;
    }

    const increment = newProgress - current;
    if (increment <= maxIncrement) {
      return newProgress;
    }

    if (current > 50) {
      return Math.min(current + 10, newProgress);
    } else if (current > 30) {
      return Math.min(current + 15, newProgress);
    } else {
      return Math.min(current + maxIncrement, newProgress);
    }
  }
}
