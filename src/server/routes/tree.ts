import { Router } from 'express';
import { treeController } from '../controllers/treeController';

export const treeRouter = Router();

treeRouter.post('/generate', treeController.generate);
treeRouter.post('/import', treeController.importTree);
treeRouter.get('/', treeController.list);
treeRouter.post('/transfer', treeController.transferTrees);
treeRouter.get('/:id/profile', treeController.getProfile);
treeRouter.get('/:id/stats', treeController.getStats);
treeRouter.get('/:id/achievements', treeController.getAchievements);
treeRouter.get('/:id/learning-plan', treeController.getLearningPlan);
treeRouter.post('/:id/learning-plan', treeController.createLearningPlan);
treeRouter.put('/:id/learning-plan/:planId', treeController.updateLearningPlan);
treeRouter.get('/:id/versions', treeController.getVersions);
treeRouter.post('/:id/versions/restore', treeController.restoreVersion);
treeRouter.get('/:id', treeController.getById);
treeRouter.put('/:id', treeController.update);
treeRouter.delete('/:id', treeController.delete);
treeRouter.post('/:id/export', treeController.export);
treeRouter.post('/:id/export-json', treeController.exportJSON);