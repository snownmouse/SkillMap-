import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import GenerateForm from '../components/Generate/GenerateForm';
import GenerateAnimation from '../components/Generate/GenerateAnimation';
import { useSkillTree } from '../hooks/useSkillTree';
import { difyApi } from '../services/difyApi';
import { UserInput } from '../types/skillTree';
import { CareerPath, CareerPlanResponse } from '../types/backend';

const GeneratePage: React.FC = () => {
  const navigate = useNavigate();
  const { generateTree, pollTaskStatus, loadTree, generating, error, clearError, cancelPolling } = useSkillTree();
  const [showAnimation, setShowAnimation] = useState(false);
  const [career, setCareer] = useState('');
  const [step, setStep] = useState<'form' | 'paths' | 'generating'>('form');
  const [careerPlan, setCareerPlan] = useState<CareerPlanResponse | null>(null);
  const [selectedPath, setSelectedPath] = useState<CareerPath | null>(null);
  const [userInput, setUserInput] = useState<UserInput | null>(null);
  const [isLoadingPaths, setIsLoadingPaths] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingStatus, setGeneratingStatus] = useState('正在分析你的职业目标...');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleFormSubmit = async (input: UserInput) => {
    if (isLoadingPaths || isGenerating) return;
    
    setUserInput(input);
    setIsLoadingPaths(true);
    setLocalError(null);
    
    try {
      const plan = await difyApi.generateCareerPlan(input);
      setCareerPlan(plan);
      setStep('paths');
    } catch (e: any) {
      setLocalError(e?.message || '生成职业规划失败，请稍后重试');
    } finally {
      setIsLoadingPaths(false);
    }
  };

  const handlePathSelect = (path: CareerPath) => {
    setSelectedPath(path);
  };

  const handleConfirmPath = async () => {
    if (!selectedPath || !userInput || isGenerating) return;

    setIsGenerating(true);
    setLocalError(null);
    setCareer(userInput.career);
    setStep('generating');
    setGeneratingStatus('正在准备生成技能树...');

    const firstCareer = selectedPath.steps[0]?.career || userInput.career;

    try {
      const taskId = await generateTree({
        ...userInput,
        selectedPathId: selectedPath.id,
        selectedCareer: firstCareer,
      });
      
      if (taskId) {
        pollTaskStatus(taskId, async (treeId) => {
          setGeneratingStatus('技能树生成完成！');
          const treeData = await loadTree(treeId);
          if (treeData) {
            setShowAnimation(true);
            setTimeout(() => {
              navigate(`/tree/${treeId}`);
            }, 3000);
          }
        }, (errorMsg) => {
          setLocalError(errorMsg);
          setIsGenerating(false);
          setStep('paths');
        });
      } else {
        setLocalError('发起生成任务失败');
        setIsGenerating(false);
        setStep('paths');
      }
    } catch (e: any) {
      setLocalError(e?.message || '生成失败，请稍后重试');
      setIsGenerating(false);
      setStep('paths');
    }
  };

  const handleSkipPaths = async () => {
    if (!userInput || !careerPlan || isGenerating) return;

    const bestPath = careerPlan.paths[0];
    if (!bestPath) return;

    setIsGenerating(true);
    setLocalError(null);
    setSelectedPath(bestPath);
    setCareer(userInput.career);
    setStep('generating');
    setGeneratingStatus('正在准备生成技能树...');

    const firstCareer = bestPath.steps[0]?.career || userInput.career;

    try {
      const taskId = await generateTree({
        ...userInput,
        selectedPathId: bestPath.id,
        selectedCareer: firstCareer,
      });
      
      if (taskId) {
        pollTaskStatus(taskId, async (treeId) => {
          setGeneratingStatus('技能树生成完成！');
          const treeData = await loadTree(treeId);
          if (treeData) {
            setShowAnimation(true);
            setTimeout(() => {
              navigate(`/tree/${treeId}`);
            }, 3000);
          }
        }, (errorMsg) => {
          setLocalError(errorMsg);
          setIsGenerating(false);
          setStep('paths');
        });
      } else {
        setLocalError('发起生成任务失败');
        setIsGenerating(false);
        setStep('paths');
      }
    } catch (e: any) {
      setLocalError(e?.message || '生成失败，请稍后重试');
      setIsGenerating(false);
      setStep('paths');
    }
  };

  const handleBack = () => {
    if (isGenerating) {
      cancelPolling();
      setIsGenerating(false);
    }
    setStep('form');
    setLocalError(null);
  };

  const displayError = localError || error;

  return (
    <div className="min-h-screen bg-light-bg text-light-text flex flex-col">
      {/* 响应式容器 */}
      <div className="flex-grow flex flex-col justify-center max-w-4xl mx-auto w-full p-4 sm:p-6 lg:p-8">
        {/* 标题区域 - 响应式设计 */}
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-light-text mb-3 sm:mb-4 tracking-tight">
            生成你的专属技能树
          </h1>
          <p className="text-sm sm:text-base lg:text-lg text-light-muted max-w-2xl mx-auto">
            AI 会根据你的目标职业，为你规划最适合的学习路径
          </p>
        </div>

        {/* 表单步骤 */}
        {step === 'form' && (
          <GenerateForm onSubmit={handleFormSubmit} isLoading={isLoadingPaths} />
        )}

        {/* 职业路径选择 - 响应式设计 */}
        {step === 'paths' && careerPlan && (
          <div className="space-y-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-center text-light-text">为你推荐的职业路径</h2>
            
            {/* 路径卡片 - 响应式网格 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              {careerPlan.paths.map((path) => (
                <div
                  key={path.id}
                  className={`p-6 sm:p-8 rounded-2xl border cursor-pointer transition-all shadow-sm ${
                    selectedPath?.id === path.id 
                      ? 'border-skill-core bg-skill-core/5 shadow-lg shadow-skill-core/10' 
                      : 'border-light-border hover:border-skill-core/50 hover:bg-skill-core/5'
                  }`}
                  onClick={() => !isGenerating && handlePathSelect(path)}
                >
                  <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3">{path.name}</h3>
                  <p className="text-light-muted mb-4 sm:mb-6 leading-relaxed text-sm sm:text-base">{path.description}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-light-muted">匹配度: <span className="text-skill-core font-bold">{path.fitScore}%</span></span>
                    <span className="text-sm font-medium text-light-text">{path.steps.length} 个阶段</span>
                  </div>
                </div>
              ))}
            </div>
            
            {/* 按钮区域 - 响应式布局 */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6">
              <button
                className="w-full sm:w-auto px-5 sm:px-6 py-3 border border-light-border rounded-xl hover:bg-light-surface transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleBack}
                disabled={isGenerating}
              >
                返回修改
              </button>
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <button
                  className="flex-1 px-5 sm:px-6 py-3 border border-light-border rounded-xl hover:bg-light-surface transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleSkipPaths}
                  disabled={isGenerating || !careerPlan?.paths[0]}
                >
                  {isGenerating ? '生成中...' : '跳过选择'}
                </button>
                <button
                  className="flex-1 px-6 sm:px-8 py-3 bg-skill-core text-white rounded-xl font-bold hover:bg-skill-core/80 transition-colors shadow-lg shadow-skill-core/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleConfirmPath}
                  disabled={!selectedPath || isGenerating}
                >
                  {isGenerating ? '生成中...' : '确认选择'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 生成中状态 - 响应式设计 */}
        {step === 'generating' && (
          <div className="text-center py-12 sm:py-16 space-y-6">
            {/* 加载动画 */}
            <div className="relative w-16 sm:w-20 h-16 sm:h-20 mx-auto">
              <div className="absolute inset-0 border-4 border-skill-core/20 rounded-full"></div>
              <div className="animate-spin w-16 sm:w-20 h-16 sm:h-20 border-4 border-skill-core border-t-transparent rounded-full"></div>
            </div>
            
            {/* 状态信息 */}
            <div className="space-y-3">
              <h2 className="text-2xl sm:text-3xl font-bold text-light-text">正在生成技能树...</h2>
              <p className="text-sm sm:text-base text-light-muted max-w-2xl mx-auto">
                AI 正在为你规划「<span className="text-skill-core font-bold">{career}</span>」的技能图谱
              </p>
              <p className="text-skill-core font-medium animate-pulse">{generatingStatus}</p>
              <p className="text-xs sm:text-sm text-light-muted/70 mt-4">预计需要 2-3 分钟，请稍候</p>
            </div>
            
            {/* 取消按钮 */}
            <button
              onClick={handleBack}
              className="mt-6 px-5 sm:px-6 py-2 text-sm text-light-muted hover:text-light-text transition-colors"
            >
              取消生成
            </button>
          </div>
        )}

        {/* 生成动画 */}
        {showAnimation && <GenerateAnimation career={career} />}

        {/* 错误提示 */}
        {displayError && (
          <div className="mt-8 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-center">
            {displayError}
          </div>
        )}
      </div>
    </div>
  );
};

export default GeneratePage;
