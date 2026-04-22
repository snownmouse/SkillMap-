import { v4 as uuidv4 } from 'uuid';
import { AbilityRepository } from '../repositories';

export class AbilityService {
  private readonly confidenceOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };

  constructor(private abilityRepo: AbilityRepository) {}

  async recordAbilities(treeId: string, nodeId: string, abilities: any[]) {
    if (!Array.isArray(abilities) || abilities.length === 0) return;

    for (const ability of abilities) {
      if (!ability.skill || !ability.confidence) continue;

      const existing = this.abilityRepo.findExistingAbility(treeId, ability.skill);

      if (existing) {
        if (this.confidenceOrder[ability.confidence] > this.confidenceOrder[existing.confidence]) {
          this.abilityRepo.updateAbility(existing.id, ability.confidence, nodeId);
        }
      } else {
        this.abilityRepo.insertAbility({
          id: uuidv4(),
          treeId,
          skill: ability.skill,
          confidence: ability.confidence,
          nodeId
        });
      }
    }
  }
}