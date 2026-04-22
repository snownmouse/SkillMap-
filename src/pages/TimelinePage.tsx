import React from 'react';
import { useSkillTree } from '../hooks/useSkillTree';
import AppLayout from '../components/Layout/AppLayout';
import TimelineView from '../components/Timeline/TimelineView';

/**
 * 时间线页面
 */
const TimelinePage: React.FC = () => {
  const { currentTree } = useSkillTree();

  if (!currentTree) {
    return (
      <div className="min-h-screen bg-light-bg flex items-center justify-center">
        <p className="text-light-muted">尚未生成技能树</p>
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto py-12 px-6">
        <div className="mb-12">
          <h1 className="text-4xl font-black text-light-text mb-4">成长历程</h1>
          <p className="text-light-muted">记录你在 {currentTree.career} 道路上的每一个脚印</p>
        </div>

        <TimelineView events={currentTree.timeline} />
      </div>
    </AppLayout>
  );
};

export default TimelinePage;
