import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';
import { Button } from './Button';

const STEPS = [
  {
    title: 'Bem-vindo ao AssetAgro!',
    description: 'Sistema de gestão de ativos de TI da Tracbel Agro. Vamos fazer um tour rápido pelas principais funcionalidades.',
  },
  {
    title: 'Dashboard',
    description: 'Visão geral de todos os equipamentos: estatísticas, gráficos, alertas de envelhecimento e garantia.',
  },
  {
    title: 'Equipamentos',
    description: 'Lista completa dos ativos com filtros, busca, seleção em lote e ações rápidas.',
  },
  {
    title: 'Novo Ativo',
    description: 'Cadastre novos equipamentos com validação de Service Tag em tempo real. Use Ctrl+N como atalho.',
  },
  {
    title: 'Exportar & Relatórios',
    description: 'Exporte para Excel/PDF por filial e visualize relatórios de custos de manutenção.',
  },
];

const STORAGE_KEY = 'assetagro_onboarding_completed';

export const OnboardingTour: React.FC = () => {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    // Verifica se já completou o onboarding
    const completed = localStorage.getItem(STORAGE_KEY);
    if (!completed) {
      // Pequeno delay para não competir com splash
      const timer = setTimeout(() => setShow(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setShow(false);
    localStorage.setItem(STORAGE_KEY, 'true');
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (step > 0) setStep(step - 1);
  };

  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60"
            onClick={handleClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="relative max-w-md w-full mx-4 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden"
          >
            {/* Progress bar */}
            <div className="h-1 bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full bg-agro-500 transition-all duration-300"
                style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
              />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-2">
              <span className="text-xs text-slate-400 font-medium">
                {step + 1} de {STEPS.length}
              </span>
              <button
                onClick={handleClose}
                title="Fechar tour"
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 pb-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                {STEPS[step].title}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {STEPS[step].description}
              </p>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 pb-5">
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePrev}
                disabled={step === 0}
                icon={<ChevronLeft className="h-4 w-4" />}
              >
                Anterior
              </Button>
              <Button
                size="sm"
                onClick={handleNext}
                icon={step < STEPS.length - 1 ? <ChevronRight className="h-4 w-4" /> : undefined}
              >
                {step < STEPS.length - 1 ? 'Próximo' : 'Começar!'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
