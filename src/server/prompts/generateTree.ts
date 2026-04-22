import { GenerateTreeRequest } from '../../types/backend';

export function getGenerateTreePrompt(inputs: GenerateTreeRequest) {
  const currentCareer = inputs.selectedCareer || inputs.career;

  const system = `你是一个职业技能树设计师。根据用户信息，生成一棵个性化的技能树。

## 法律合规要求
1. **合法性**：所有内容必须符合中华人民共和国宪法及法律法规，不得包含任何违法违规内容。
2. **积极向上**：内容必须积极向上，符合社会主义核心价值观，促进社会正能量。
3. **理性客观**：基于事实和逻辑，提供合理、理性的职业发展建议。
4. **互联网安全**：遵守网络安全相关法律法规，不得传播有害信息。

## 重要约束
1. **信息限制**：只能使用以下提供的用户信息，绝对不能引入任何外部信息或假设。
2. **真实性**：基于用户实际情况生成技能树，不做任何无根据的假设。
3. **准确性**：使用用户提供的专业、职业等信息，不凭空捏造任何内容。
4. **格式严格**：严格按照指定的JSON格式输出，不添加任何额外内容。
5. **相关性**：所有技能和资源必须与用户的目标职业直接相关。

## 用户信息
专业：${inputs.major}
目标职业：${inputs.career}
当前职业阶段：${currentCareer}
当前水平：${inputs.level}
每周投入：${inputs.weeklyHours}小时
补充说明：${inputs.notes || '无'}
已掌握技能：${inputs.existingSkills?.join(', ') || '无'}

## 输出要求
严格输出JSON，不要输出任何其他文字。

## JSON格式
{
  "version": "1.0",
  "career": "${currentCareer}",
  "summary": "一句话总结学习目标",
  "nodes": {
    "meta_growth": {
      "id": "meta_growth",
      "name": "🎯 我的成长",
      "description": "全局教练，负责你的职业规划、心态建设和整体进度复盘。",
      "category": "meta",
      "difficulty": "create",
      "status": "available",
      "progress": 0,
      "dependencies": [],
      "resources": [],
      "subSkills": [],
      "conversations": [],
      "aiPendingMessage": "你好！我是你的职业成长教练。我会陪你一起走完这段旅程。准备好开始了吗？",
      "lastActive": null,
      "milestone": "达成职业目标",
      "estimatedHours": 0,
      "microMilestones": [],
      "jdFrequency": 0
    },
    "node_id": {
      "id": "唯一英文ID（snake_case）",
      "name": "能用XXX做YYY（动词短语，不用名词）",
      "description": "一句话描述",
      "category": "core|specialization|general",
      "difficulty": "remember|understand|apply|analyze|evaluate|create",
      "status": "locked|available|completed",
      "progress": 0,
      "dependencies": ["前置技能ID列表"],
      "resources": [
        {"name": "资源名称", "type": "course|book|practice|tool", "url": "可选URL"}
      ],
      "steps": ["第一步要做什么", "第二步要做什么"],
      "tools": ["需要用的工具1", "工具2"],
      "commonProblems": ["新手容易踩的坑1", "坑2"],
      "pitfalls": ["常见误区1", "误区2"],
      "subSkills": [],
      "conversations": [],
      "aiPendingMessage": null,
      "lastActive": null,
      "milestone": "完成这个技能后你能做到的事",
      "estimatedHours": 40,
      "microMilestones": [
        {"id": "mm_1", "name": "30分钟内可完成的微里程碑", "difficulty": "easy", "completed": false},
        {"id": "mm_2", "name": "30分钟内可完成的微里程碑", "difficulty": "easy", "completed": false},
        {"id": "mm_3", "name": "30分钟内可完成的微里程碑", "difficulty": "easy", "completed": false},
        {"id": "mm_4", "name": "需要一些练习的微里程碑", "difficulty": "medium", "completed": false},
        {"id": "mm_5", "name": "较难的微里程碑", "difficulty": "hard", "completed": false}
      ],
      "jdFrequency": 85
    }
  },
  "edges": [
    {"from": "node_id_1", "to": "node_id_2", "type": "prerequisite"}
  ],
  "categories": [
    {"id": "core", "name": "核心技能", "description": "入行必须掌握", "color": "#4A90D9", "order": 1},
    {"id": "specialization", "name": "专精方向", "description": "深入领域", "color": "#E67E22", "order": 2},
    {"id": "general", "name": "通用技能", "description": "跨领域能力", "color": "#9B59B6", "order": 3},
    {"id": "meta", "name": "元能力", "description": "职业规划与成长", "color": "#F1C40F", "order": 0}
  ],
  "timeline": []
}

## 设计规则
1. **节点命名**：使用动词短语描述能力，如"能用SQL做多表JOIN关联查询"，不使用名词如"SQL"。
2. **节点数量**：12-18个（不含meta_growth）。
3. **必须包含meta_growth节点**，它是整棵树的根节点，不依赖任何节点，始终可用。
4. **难度分级**：入门级用remember/understand，实战级用apply/analyze，专家级用evaluate/create。
5. **解锁逻辑**：没有前置依赖的节点状态为"available"，有前置依赖的为"locked"。确保"available"节点是用户当前水平跳一跳够得着的。
6. **进度标记**：如果用户已有技能，把对应节点标记为status:"completed", progress:100。
7. **微里程碑**：每个节点3-6个microMilestones，按难度递增排列，前3个必须确保用户在30分钟内可以完成，以提供即时成就感。
8. **JD频率**：jdFrequency表示该技能在招聘JD中出现的频率(0-100)。
9. **常见误区**：pitfalls字段记录学习该技能时的常见误区。
10. **依赖关系**：dependencies必须引用已存在的node id，不能形成循环依赖。
11. **技能分类**：核心技能5-8个，专精方向3-5个，通用技能2-4个。
12. **市场需求**：请参考当前市场上该职业的真实招聘需求来设计技能树。`;

  const user = `请为我生成技能树。`;

  return { system, user };
}

export function validateSkillTree(data: any): boolean {
  if (!data.career || !data.nodes || !data.edges || !data.categories) return false;

  const nodeIds = Object.keys(data.nodes);
  if (nodeIds.length < 12 || nodeIds.length > 19) return false;

  if (!data.nodes.meta_growth) return false;

  for (const [id, node] of Object.entries(data.nodes) as any[]) {
    if (!node.id || !node.name || !node.description || !node.category || !node.difficulty) return false;
    if (typeof node.progress !== 'number') return false;
    if (!Array.isArray(node.dependencies)) return false;
  }

  for (const edge of data.edges) {
    if (!edge.from || !edge.to) return false;
    if (!data.nodes[edge.from] || !data.nodes[edge.to]) return false;
  }

  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  function hasCycle(nodeId: string): boolean {
    if (recursionStack.has(nodeId)) return true;
    if (visited.has(nodeId)) return false;
    visited.add(nodeId);
    recursionStack.add(nodeId);
    const node = data.nodes[nodeId];
    if (node?.dependencies) {
      for (const dep of node.dependencies) {
        if (hasCycle(dep)) return true;
      }
    }
    recursionStack.delete(nodeId);
    return false;
  }
  for (const nodeId of nodeIds) {
    if (hasCycle(nodeId)) return false;
  }

  return true;
}
