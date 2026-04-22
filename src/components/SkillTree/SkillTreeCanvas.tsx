import React, { lazy, Suspense } from 'react';
import { SkillTreeData } from '../../types/skillTree';

const SkillTreeCanvasImpl = lazy(() => import('./SkillTreeCanvasImpl'));

interface SkillTreeCanvasProps {
  data: SkillTreeData;
  onNodeClick: (nodeId: string) => void;
}

const SkillTreeCanvas: React.FC<SkillTreeCanvasProps> = (props) => {
  return (
    <Suspense
      fallback={
        <div className="w-full h-full bg-light-bg flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="w-8 h-8 border-2 border-skill-core border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-light-muted text-sm">加载画布引擎...</p>
          </div>
        </div>
      }
    >
      <SkillTreeCanvasImpl {...props} />
    </Suspense>
  );
};

export default SkillTreeCanvas;
