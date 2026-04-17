/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageCircle, 
  Loader2, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  User, 
  Phone, 
  Mail, 
  Calendar, 
  DollarSign,
  ChevronRight,
  Download
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { domToCanvas } from 'modern-screenshot';
import { generateDiagnosis, BeliefDiagnosis } from './services/claudeService';
import { saveToGoogleSheets } from './services/dataService';

type Screen = 
  | 'intro' 
  | 'name' 
  | 'whatsapp' 
  | 'email' 
  | 'gender' 
  | 'maritalStatus' 
  | 'age' 
  | 'income' 
  | 'description' 
  | 'loading' 
  | 'result';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('intro');
  const [userName, setUserName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState('');
  const [maritalStatus, setMaritalStatus] = useState('');
  const [age, setAge] = useState('');
  const [income, setIncome] = useState('');
  const [inputText, setInputText] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  
  const diagnosisRef = useRef<HTMLDivElement>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [diagnosis, setDiagnosis] = useState<BeliefDiagnosis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingPhrase, setLoadingPhrase] = useState('Analisando suas crenças...');

  // Auto-hide error toast
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Loading phrases rotation
  useEffect(() => {
    if (currentScreen === 'loading') {
      const phrases = [
        "Analisando suas crenças.",
        "Mapeando padrões de comportamentos ligados a esses resultados...",
        "Identificando bloqueios subconscientes...",
        "Conectando com o Método de Reprogramação de Crenças...",
        "A IA está analisando a base de dados dos últimos 10 anos do Paulo Marinho..."
      ];
      let i = 0;
      const interval = setInterval(() => {
        i = (i + 1) % phrases.length;
        setLoadingPhrase(phrases[i]);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [currentScreen]);

  const nextScreen = (screen: Screen) => {
    setError(null);
    setCurrentScreen(screen);
  };

  const handleGenerateDiagnosis = async () => {
    if (!inputText.trim()) return;
    
    setCurrentScreen('loading');
    setIsAnalyzing(true);

    try {
      const result = await generateDiagnosis(inputText, userName);
      setDiagnosis(result);
      setCurrentScreen('result');
    } catch (err) {
      setError("Ocorreu um erro ao processar seu diagnóstico. Tente novamente.");
      setCurrentScreen('description');
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getWhatsAppUrl = () => {
    const message = encodeURIComponent(`Olá! Sou o ${userName}. Acabei de receber meu diagnóstico de crenças do Método MRC e gostaria de agendar uma sessão individual para aprofundar os pontos identificados.`);
    return `https://wa.me/5511999753518?text=${message}`;
  };

  const handleWhatsAppRedirect = () => {
    window.open(getWhatsAppUrl(), '_blank');
  };

  const handleDownloadPDF = async () => {
    if (!diagnosisRef.current) return;
    
    setIsGeneratingPDF(true);
    try {
      const element = diagnosisRef.current;
      
      // Ensure layout is fully settled
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const canvas = await domToCanvas(element, {
        scale: 1.8,
        backgroundColor: '#0a0a0a',
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      
      // Dynamic link calculation
      const whatsappBtn = element.querySelector('[data-pdf-link="whatsapp"]');
      if (whatsappBtn) {
        const btnRect = whatsappBtn.getBoundingClientRect();
        const containerRect = element.getBoundingClientRect();
        
        // Calculate relative position
        const relX = btnRect.left - containerRect.left;
        const relY = btnRect.top - containerRect.top;
        const relW = btnRect.width;
        const relH = btnRect.height;
        
        pdf.link(relX, relY, relW, relH, { url: getWhatsAppUrl() });
      }
      
      pdf.save(`Diagnostico_MRC_${userName.replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error("Error generating PDF:", err);
      setError("Erro ao gerar PDF. Tente novamente.");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // ✅ CORRIGIDO: removida dependência do diagnosisRef.current
  // O ref pode ser null no primeiro render, bloqueando o save
  useEffect(() => {
    const autoSave = async () => {
      if (diagnosis && currentScreen === 'result' && !hasSaved) {
        setHasSaved(true);
        setSaveStatus('saving');

        saveToGoogleSheets({
          timestamp: new Date().toLocaleString('pt-BR'),
          userName,
          whatsapp,
          email,
          gender,
          maritalStatus,
          age,
          income,
          inputText,
          diagnosis,
          pdfBase64: ''
        }).then(() => {
          setSaveStatus('success');
        }).catch(err => {
          console.error("Background save failed:", err);
          setSaveStatus('error');
        });
      }
    };

    autoSave();
  }, [diagnosis, currentScreen]);

  const renderScreen = () => {
    switch (currentScreen) {
      case 'intro':
        return (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center text-center space-y-12 max-w-2xl mx-auto px-6 py-20"
          >
            <h1 className="text-white text-4xl md:text-5xl font-serif leading-tight">
              Sua vida atual é o resultado de um <span className="text-gold">sistema invisível</span>. Vamos descobri-lo?
            </h1>
            
            <div className="space-y-6 w-full">
              <div className="flex items-start gap-3 text-left max-w-md mx-auto bg-white/5 p-4 rounded-lg border border-white/10">
                <input 
                  type="checkbox" 
                  id="lgpd-consent"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-gold/30 bg-transparent text-gold focus:ring-gold"
                />
                <label htmlFor="lgpd-consent" className="text-xs opacity-60 leading-relaxed cursor-pointer">
                  Eu concordo com o processamento dos meus dados pessoais para fins de diagnóstico comportamental, conforme a <button onClick={() => setShowPrivacyModal(true)} className="text-gold underline hover:text-gold/80">Política de Privacidade</button> e os termos da LGPD.
                </label>
              </div>

              <button 
                onClick={() => acceptedTerms ? nextScreen('name') : setError('Você precisa aceitar os termos para continuar.')}
                className={`px-12 py-5 bg-gold text-black uppercase text-sm font-bold tracking-[3px] rounded-sm transition-all shadow-lg ${acceptedTerms ? 'hover:scale-105 shadow-gold/20' : 'opacity-50 cursor-not-allowed'}`}
              >
                Iniciar Diagnóstico
              </button>
            </div>

            <AnimatePresence>
              {showPrivacyModal && (
                <PrivacyModal onClose={() => setShowPrivacyModal(false)} />
              )}
            </AnimatePresence>
          </motion.div>
        );

      case 'name':
        return (
          <StepContainer 
            title="Qual o seu nome?"
            onBack={() => setCurrentScreen('intro')}
            onNext={() => userName ? nextScreen('whatsapp') : setError('Por favor, insira seu nome.')}
          >
            <input
              autoFocus
              type="text"
              placeholder="Seu nome completo"
              className="w-full bg-transparent border-b border-gold/30 py-4 text-2xl text-white focus:outline-none focus:border-gold transition-all text-center"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
            />
          </StepContainer>
        );

      case 'whatsapp':
        return (
          <StepContainer 
            title="Whatsapp com DDD"
            onBack={() => setCurrentScreen('name')}
            onNext={() => whatsapp ? nextScreen('email') : setError('Por favor, insira seu Whatsapp.')}
          >
            <input
              autoFocus
              type="tel"
              placeholder="(00) 9 0000 0000"
              className="w-full bg-transparent border-b border-gold/30 py-4 text-2xl text-white focus:outline-none focus:border-gold transition-all text-center placeholder:opacity-20"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
            />
          </StepContainer>
        );

      case 'email':
        return (
          <StepContainer 
            title="E-mail"
            onBack={() => setCurrentScreen('whatsapp')}
            onNext={() => (email && email.includes('@')) ? nextScreen('gender') : setError('Por favor, insira um e-mail válido.')}
          >
            <input
              autoFocus
              type="email"
              placeholder="seu@email.com"
              className="w-full bg-transparent border-b border-gold/30 py-4 text-2xl text-white focus:outline-none focus:border-gold transition-all text-center"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </StepContainer>
        );

      case 'gender':
        return (
          <StepContainer 
            title="Qual o seu sexo?"
            onBack={() => setCurrentScreen('email')}
            hideNext
          >
            <div className="grid grid-cols-1 gap-4 w-full max-w-xs mx-auto">
              {['Masculino', 'Feminino', 'Outro'].map((opt) => (
                <button
                  key={opt}
                  onClick={() => { setGender(opt); nextScreen('maritalStatus'); }}
                  className={`py-4 border ${gender === opt ? 'border-gold bg-gold/10' : 'border-white/10'} rounded text-white hover:border-gold transition-all`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </StepContainer>
        );

      case 'maritalStatus':
        return (
          <StepContainer 
            title="Estado civil"
            onBack={() => setCurrentScreen('gender')}
            hideNext
          >
            <div className="grid grid-cols-1 gap-3 w-full max-w-xs mx-auto">
              {['Solteiro (a)', 'Casado (a)', 'Divorciado (a)', 'Em união estável', 'Viúvo (a)'].map((opt) => (
                <button
                  key={opt}
                  onClick={() => { setMaritalStatus(opt); nextScreen('age'); }}
                  className={`py-3 border ${maritalStatus === opt ? 'border-gold bg-gold/10' : 'border-white/10'} rounded text-white hover:border-gold transition-all text-sm`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </StepContainer>
        );

      case 'age':
        return (
          <StepContainer 
            title="Sua idade"
            onBack={() => setCurrentScreen('maritalStatus')}
            onNext={() => age ? nextScreen('income') : setError('Por favor, insira sua idade.')}
          >
            <input
              autoFocus
              type="number"
              placeholder="Ex: 35"
              className="w-full bg-transparent border-b border-gold/30 py-4 text-2xl text-white focus:outline-none focus:border-gold transition-all text-center placeholder:opacity-20"
              value={age}
              onChange={(e) => setAge(e.target.value)}
            />
          </StepContainer>
        );

      case 'income':
        return (
          <StepContainer 
            title="Renda Mensal"
            onBack={() => setCurrentScreen('age')}
            hideNext
          >
            <div className="grid grid-cols-1 gap-3 w-full max-w-xs mx-auto">
              {[
                'Até R$ 2.000',
                'R$ 2.001 a R$ 5.000',
                'R$ 5.001 a R$ 10.000',
                'R$ 10.001 a R$ 20.000',
                'Acima de R$ 20.000'
              ].map((opt) => (
                <button
                  key={opt}
                  onClick={() => { setIncome(opt); nextScreen('description'); }}
                  className={`py-3 border ${income === opt ? 'border-gold bg-gold/10' : 'border-white/10'} rounded text-white hover:border-gold transition-all text-sm`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </StepContainer>
        );

      case 'description':
        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col h-full max-w-4xl mx-auto"
          >
            <div className="flex-1 overflow-y-auto px-6 pt-10 pb-4 space-y-8">
              <div className="space-y-4 text-center md:text-left">
                <h2 className="text-white text-3xl font-serif">O que está acontecendo hoje?</h2>
                <p className="text-sm opacity-60 leading-relaxed max-w-2xl">
                  Quanto mais você escrever, mais claro e profundo será o diagnóstico. Descreva em suas palavras como você se sente, o que te limita, o que você gostaria de mudar. Qual seu maior desafio? Sua maior dor? O que gerou isso?
                </p>
              </div>

              <textarea
                autoFocus
                className="w-full min-h-[80px] overflow-hidden bg-transparent border-none text-xl text-white leading-relaxed resize-none focus:outline-none placeholder:opacity-10"
                placeholder="Sinta-se em um quadro em branco..."
                value={inputText}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
  setInputText(e.target.value);
  e.target.style.height = 'auto';
  e.target.style.height = e.target.scrollHeight + 'px';
}}
              />
            </div>

            <div className="flex-shrink-0 px-6 py-4 border-t border-white/5 bg-dark-bg/95 backdrop-blur-sm flex flex-col md:flex-row items-center justify-between gap-4">
              <button
                onClick={() => setCurrentScreen('income')}
                className="flex items-center gap-2 text-xs uppercase tracking-widest opacity-40 hover:opacity-100 transition-all"
              >
                <ArrowLeft className="w-4 h-4" /> Anterior
              </button>

              <button
                onClick={handleGenerateDiagnosis}
                disabled={!inputText.trim() || isAnalyzing}
                className={`px-12 py-5 bg-gold text-black uppercase text-sm font-bold tracking-[3px] rounded-sm transition-all flex items-center gap-3 ${inputText.length > 20 ? 'animate-pulse shadow-lg shadow-gold/40 scale-105' : 'opacity-50'}`}
              >
                Gerar Diagnóstico <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        );

      case 'loading':
        return (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-10 space-y-12">
            <div className="relative w-32 h-32">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 border-4 border-gold/10 border-t-gold rounded-full"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-gold animate-spin" />
              </div>
            </div>
            <div className="space-y-4 max-w-sm">
              <AnimatePresence mode="wait">
                <motion.p 
                  key={loadingPhrase}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-gold font-serif italic text-xl"
                >
                  {loadingPhrase}
                </motion.p>
              </AnimatePresence>
            </div>
          </div>
        );

      case 'result':
        if (!diagnosis) return null;
        return (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-4xl mx-auto px-4 py-8 space-y-12"
          >
            {/* Save Status Indicator */}
            <div className="flex justify-center -mb-4">
              {saveStatus === 'saving' && (
                <div className="flex items-center gap-2 text-[10px] text-gold/60 uppercase tracking-[2px] animate-pulse">
                  <Loader2 className="w-3 h-3 animate-spin" /> Sincronizando relatório...
                </div>
              )}
              {saveStatus === 'success' && (
                <div className="flex items-center gap-2 text-[10px] text-green-500/60 uppercase tracking-[2px]">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" /> Relatório arquivado com sucesso
                </div>
              )}
            </div>

            {/* Mobile-First Diagnosis Container */}
            <div 
              ref={diagnosisRef} 
              className="bg-[#0a0a0a] text-white flex flex-col max-w-[450px] mx-auto shadow-2xl border border-white/5"
              style={{ height: 'auto' }}
            >
              {/* Editorial Header */}
              <div className="p-8 pt-16 space-y-8 text-center border-b border-gold/10">
                <div className="space-y-2">
                  <p className="text-gold text-[10px] uppercase tracking-[5px] font-bold">Relatório Comportamental</p>
                  <h2 className="text-white text-3xl md:text-4xl font-serif leading-tight px-4">
                    {diagnosis.title}
                  </h2>
                </div>
                
                <div className="flex flex-col items-center gap-2 pt-4">
                  <div className="h-px w-12 bg-gold/30" />
                  <p className="text-[11px] opacity-50 uppercase tracking-[3px]">
                    Exclusivo para: {userName}
                  </p>
                  <p className="text-[9px] opacity-30 uppercase tracking-[2px]">
                    Emitido em {new Date().toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>

              {/* Content Sections */}
              <div className="p-8 space-y-12">
                {/* Intro */}
                <div className="relative">
                  <div className="absolute -left-4 top-0 text-6xl text-gold/10 font-serif">"</div>
                  <p className="text-xl leading-relaxed text-white/90 italic relative z-10 pl-2">
                    {diagnosis.intro}
                  </p>
                </div>

                {/* Root Beliefs */}
                <div className="space-y-6">
                  <h3 className="text-gold text-[12px] uppercase tracking-[3px] font-bold flex items-center gap-3">
                    <span className="h-px flex-1 bg-gold/20" /> 
                    Crenças Raiz 
                    <span className="h-px flex-1 bg-gold/20" />
                  </h3>
                  <div className="space-y-4">
                    {diagnosis.rootBeliefs.map((belief, i) => (
                      <div key={i} className="flex gap-4 items-start p-5 bg-white/[0.02] border border-white/5 rounded-lg">
                        <div className="w-1.5 h-1.5 rounded-full bg-gold mt-2.5 shrink-0" />
                        <p className="text-base opacity-80 leading-snug">{belief}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Emotional Patterns */}
                <div className="space-y-6">
                  <h3 className="text-gold text-[12px] uppercase tracking-[3px] font-bold flex items-center gap-3">
                    <span className="h-px flex-1 bg-gold/20" /> 
                    Mecanismos 
                    <span className="h-px flex-1 bg-gold/20" />
                  </h3>
                  <div className="space-y-8">
                    {diagnosis.emotionalPatterns.map((pattern, i) => (
                      <div key={i} className="space-y-3">
                        <h4 className="text-white font-serif text-2xl">{pattern.title}</h4>
                        <p className="text-base opacity-60 leading-relaxed">{pattern.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Manifestations */}
                <div className="space-y-6">
                  <h3 className="text-gold text-[12px] uppercase tracking-[3px] font-bold flex items-center gap-3">
                    <span className="h-px flex-1 bg-gold/20" /> 
                    Impactos Reais 
                    <span className="h-px flex-1 bg-gold/20" />
                  </h3>
                  <div className="grid grid-cols-1 gap-4">
                    {diagnosis.manifestations.map((manifest, i) => (
                      <div key={i} className="flex gap-4 items-center p-4 bg-gold/[0.03] border border-gold/10 rounded-md">
                        <CheckCircle2 className="w-4 h-4 text-gold shrink-0" />
                        <p className="text-base opacity-70">{manifest}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Analysis */}
                <div className="bg-gold/[0.03] border border-gold/20 p-10 rounded-2xl space-y-8">
                  <h3 className="text-gold font-serif text-3xl text-center">O que este diagnóstico revela</h3>
                  <div className="text-base leading-relaxed opacity-80 whitespace-pre-line text-justify font-light">
                    {diagnosis.analysis}
                  </div>
                  <div className="pt-8 border-t border-gold/10 text-center italic text-gold/80 text-base">
                    {diagnosis.closingInvite}
                  </div>
                </div>

                {/* Recommendations - Vertical for Mobile */}
                <div className="space-y-6 pt-4">
                  <RecommendationCard title="Diagnóstico" content={diagnosis.recommendations.diagnosis} />
                  <RecommendationCard title="Reprogramação" content={diagnosis.recommendations.reprogramming} />
                  <RecommendationCard title="Consolidação" content={diagnosis.recommendations.consolidation} />
                </div>

                {/* Call to Action - INSIDE THE PDF */}
                <div className="pt-16 pb-12 space-y-8 text-center border-t border-white/5">
                  <div className="space-y-3">
                    <p className="text-[11px] uppercase tracking-[2px] opacity-40">Próximo Passo Sugerido</p>
                    <p className="text-base italic opacity-60">Agende sua sessão estratégica individual com Paulo.</p>
                  </div>
                  
                  <button 
                    onClick={handleWhatsAppRedirect}
                    data-pdf-link="whatsapp"
                    className="px-8 py-6 bg-whatsapp text-white uppercase text-sm font-bold tracking-[3px] rounded-full flex items-center justify-center gap-3 shadow-xl shadow-whatsapp/20 w-full"
                  >
                    <MessageCircle className="w-6 h-6" />
                    Falar com Paulo agora
                  </button>

                  <div className="pt-10 opacity-20 text-[9px] uppercase tracking-[4px]">
                    Método MRC • Todos os direitos reservados
                  </div>
                </div>
              </div>
            </div>

            {/* External Controls */}
            <div className="flex flex-col items-center gap-6 py-8">
              <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                <button
                  onClick={handleDownloadPDF}
                  disabled={isGeneratingPDF}
                  className="px-12 py-6 bg-white text-black uppercase text-sm font-bold tracking-[3px] rounded-full hover:bg-gold transition-all flex items-center justify-center gap-3 shadow-xl"
                >
                  {isGeneratingPDF ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <Download className="w-6 h-6" />
                  )}
                  {isGeneratingPDF ? 'Preparando...' : 'Baixar PDF'}
                </button>
              </div>
              <p className="text-xs opacity-40 text-center max-w-xs">
                O relatório foi otimizado para leitura em smartphones. O botão de WhatsApp dentro do PDF é clicável.
              </p>
            </div>
          </motion.div>
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-dark-bg text-[#E0E0E0] font-sans selection:bg-gold selection:text-black">
      {/* Header */}
      {currentScreen !== 'intro' && currentScreen !== 'loading' && (
        <header className="px-6 py-8 md:px-16 flex justify-between items-center border-b border-white/5 bg-dark-bg/80 backdrop-blur-md sticky top-0 z-50">
          <div className="text-gold font-serif text-xl tracking-[4px] uppercase">
            MRC
          </div>
          <div className="text-[9px] uppercase tracking-[2px] opacity-40 hidden md:block">
            SISTEMA DE DIAGNÓSTICO DE CRENÇAS
          </div>
        </header>
      )}

      <main className="flex-1 flex flex-col">
        <AnimatePresence mode="wait">
          {renderScreen()}
        </AnimatePresence>
      </main>

      {/* Progress Bar for multi-step */}
      {['name', 'whatsapp', 'email', 'gender', 'maritalStatus', 'age', 'income', 'description'].includes(currentScreen) && (
        <div className="fixed bottom-0 left-0 w-full h-1 bg-white/5">
          <motion.div 
            className="h-full bg-gold"
            initial={{ width: 0 }}
            animate={{ 
              width: `${(
                ['name', 'whatsapp', 'email', 'gender', 'maritalStatus', 'age', 'income', 'description'].indexOf(currentScreen) + 1
              ) / 8 * 100}%` 
            }}
          />
        </div>
      )}

      {/* Error Toast */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-red-900/90 text-white px-6 py-3 rounded-full text-sm border border-red-500/50 backdrop-blur-md z-[100]"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StepContainer({ 
  title, 
  children, 
  onBack, 
  onNext, 
  hideNext = false 
}: { 
  title: string; 
  children: React.ReactNode; 
  onBack: () => void; 
  onNext?: () => void;
  hideNext?: boolean;
}) {
  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex-1 flex flex-col items-center justify-center p-6 space-y-12 max-w-xl mx-auto w-full"
    >
      <h2 className="text-white text-3xl md:text-4xl font-serif text-center leading-tight">
        {title}
      </h2>
      
      <div className="w-full">
        {children}
      </div>

      <div className="flex items-center gap-8 pt-4">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-xs uppercase tracking-widest opacity-40 hover:opacity-100 transition-all"
        >
          <ArrowLeft className="w-4 h-4" /> Anterior
        </button>
        
        {!hideNext && (
          <button 
            onClick={onNext}
            className="flex items-center gap-2 text-xs uppercase tracking-widest text-gold font-bold hover:scale-110 transition-all"
          >
            Próximo <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </motion.div>
  );
}

function RecommendationCard({ title, content }: { title: string, content: string }) {
  return (
    <div className="bg-dark-accent/50 border border-white/5 p-8 rounded-2xl space-y-4">
      <h4 className="text-white text-sm font-bold uppercase tracking-[2px] text-center border-b border-white/10 pb-4">{title}</h4>
      <div className="text-base opacity-60 whitespace-pre-line leading-relaxed">
        {content}
      </div>
    </div>
  );
}

function PrivacyModal({ onClose }: { onClose: () => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/90 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-dark-card border border-white/10 p-8 md:p-12 rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto space-y-8 relative"
      >
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 text-white/40 hover:text-white transition-all"
        >
          Fechar
        </button>

        <h2 className="text-gold text-2xl font-serif">Política de Privacidade e LGPD</h2>
        
        <div className="space-y-6 text-sm opacity-70 leading-relaxed text-left">
          <section className="space-y-2">
            <h3 className="text-white font-bold">1. Coleta de Dados</h3>
            <p>Coletamos informações básicas (nome, e-mail, whatsapp) e dados comportamentais fornecidos voluntariamente por você para gerar o diagnóstico do Método MRC.</p>
          </section>

          <section className="space-y-2">
            <h3 className="text-white font-bold">2. Finalidade</h3>
            <p>Seus dados são utilizados exclusivamente para: (a) Gerar o diagnóstico personalizado via Inteligência Artificial; (b) Armazenar seu histórico para acompanhamento profissional; (c) Permitir o contato para agendamento de sessões individuais.</p>
          </section>

          <section className="space-y-2">
            <h3 className="text-white font-bold">3. Processamento via IA</h3>
            <p>O relato do seu desafio atual é processado pela API do Google Gemini para identificar padrões subconscientes. Nenhum dado é utilizado para treinamento público de modelos de IA.</p>
          </section>

          <section className="space-y-2">
            <h3 className="text-white font-bold">4. Seus Direitos</h3>
            <p>De acordo com a LGPD, você tem o direito de acessar, corrigir ou solicitar a exclusão de seus dados a qualquer momento através do nosso canal de suporte.</p>
          </section>

          <section className="space-y-2">
            <h3 className="text-white font-bold">5. Segurança</h3>
            <p>Implementamos medidas técnicas para proteger seus dados contra acessos não autorizados e situações acidentais ou ilícitas de destruição, perda ou alteração.</p>
          </section>
        </div>

        <button 
          onClick={onClose}
          className="w-full py-4 bg-gold text-black font-bold uppercase text-xs tracking-widest rounded-sm"
        >
          Entendi e Aceito
        </button>
      </motion.div>
    </motion.div>
  );
}