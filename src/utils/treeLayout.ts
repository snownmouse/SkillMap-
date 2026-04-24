import { SkillTreeData } from '../types/skillTree';

export function getTopologicalSort(data: SkillTreeData): string[] {
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const result: string[] = [];

  function visit(id: string) {
    if (visited.has(id)) return;
    if (visiting.has(id)) return;
    visiting.add(id);

    const node = data.nodes[id];
    if (node && node.dependencies) {
      node.dependencies.forEach(depId => visit(depId));
    }
    visiting.delete(id);
    visited.add(id);
    result.push(id);
  }

  Object.keys(data.nodes).forEach(id => visit(id));
  return result;
}

export function calculateNodeLevels(data: SkillTreeData): Record<string, number> {
  const levels: Record<string, number> = {};
  const visiting = new Set<string>();

  function getLevel(id: string): number {
    if (levels[id] !== undefined) return levels[id];
    if (visiting.has(id)) {
      levels[id] = 0;
      return 0;
    }
    visiting.add(id);

    const node = data.nodes[id];
    if (!node || !node.dependencies || node.dependencies.length === 0) {
      levels[id] = 0;
      visiting.delete(id);
      return 0;
    }

    const depLevels = node.dependencies.map(depId => getLevel(depId));
    const maxLevel = Math.max(...depLevels) + 1;
    levels[id] = maxLevel;
    visiting.delete(id);
    return maxLevel;
  }

  Object.keys(data.nodes).forEach(id => getLevel(id));
  return levels;
}
