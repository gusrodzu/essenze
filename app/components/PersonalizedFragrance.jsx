import {useEffect, useMemo, useRef, useState} from 'react';
import {Money} from '@shopify/hydrogen';
import UnifiedProductCard from './UnifiedProductCard';
import PerfumeLoadingExperience from './PerfumeLoadingExperience';
import EssenzeIcon from './EssenzeIcon';
import {
  FRAGRANCE_QUIZ_STEPS,
  getSelectionLabels,
  rankFragranceProducts,
} from '~/lib/fragranceRecommendations';
import styles from '~/styles/PersonalizedFragrance.module.css';

const QUIZ_STEP_ICONS = {
  recipient: 'heart',
  gender: 'user',
  personality: 'sparkles',
  occasion: 'calendar',
  intensity: 'bottle',
};

const RECOMMENDATION_PREPARATION_TIME = 7000;

const INITIAL_SELECTIONS = {
  recipient: null,
  gender: null,
  personality: null,
  occasion: null,
  intensity: null,
};

export default function PersonalizedFragrance({products = [], initiallyOpen = false}) {
  const [isStarted, setIsStarted] = useState(initiallyOpen);
  const [currentStep, setCurrentStep] = useState(1);
  const [selections, setSelections] = useState(INITIAL_SELECTIONS);
  const [showResults, setShowResults] = useState(false);
  const [isPreparingResults, setIsPreparingResults] = useState(false);
  const sectionRef = useRef(null);
  const preparationTimerRef = useRef(null);

  const currentQuestion = FRAGRANCE_QUIZ_STEPS.find(
    (step) => step.id === currentStep,
  );
  const selectedValue = currentQuestion
    ? selections[currentQuestion.key]
    : null;

  const result = useMemo(
    () => rankFragranceProducts(products, selections, 8),
    [products, selections],
  );

  const selectionLabels = useMemo(
    () => getSelectionLabels(selections),
    [selections],
  );

  useEffect(() => {
    if (!showResults) return;
    sectionRef.current?.scrollIntoView({behavior: 'smooth', block: 'start'});
  }, [showResults]);

  useEffect(() => {
    return () => window.clearTimeout(preparationTimerRef.current);
  }, []);

  const handleSelectOption = (key, value) => {
    setSelections((previous) => ({...previous, [key]: value}));
  };

  const handleNextStep = () => {
    if (!selectedValue) return;
    setCurrentStep((step) => Math.min(step + 1, FRAGRANCE_QUIZ_STEPS.length));
  };

  const handlePrevStep = () => {
    setCurrentStep((step) => Math.max(step - 1, 1));
  };

  const handleGetRecommendations = () => {
    if (!selectedValue || isPreparingResults) return;

    window.clearTimeout(preparationTimerRef.current);
    setIsPreparingResults(true);

    requestAnimationFrame(() => {
      sectionRef.current?.scrollIntoView({behavior: 'smooth', block: 'start'});
    });

    const preparationTime = window.matchMedia?.('(prefers-reduced-motion: reduce)')
      ?.matches
      ? 900
      : RECOMMENDATION_PREPARATION_TIME;

    preparationTimerRef.current = window.setTimeout(() => {
      setShowResults(true);
      setIsPreparingResults(false);
    }, preparationTime);
  };

  const handleReset = () => {
    window.clearTimeout(preparationTimerRef.current);
    setIsPreparingResults(false);
    setIsStarted(true);
    setSelections(INITIAL_SELECTIONS);
    setCurrentStep(1);
    setShowResults(false);
    requestAnimationFrame(() => {
      sectionRef.current?.scrollIntoView({behavior: 'smooth', block: 'center'});
    });
  };

  return (
    <section
      id="recomendaciones"
      ref={sectionRef}
      className={styles.section}
      aria-labelledby="personalized-fragrance-title"
      aria-busy={isPreparingResults}
    >
      {!isStarted && !showResults ? (
        <AdvisorIntro onStart={() => setIsStarted(true)} />
      ) : isPreparingResults ? (
        <PerfumeLoadingExperience
          duration={RECOMMENDATION_PREPARATION_TIME}
          eyebrow="Asesor Olfativo Essenze"
          title="Creando tu ADN olfativo"
          messages={[
            'Iniciando análisis',
            'Interpretando tu personalidad',
            'Analizando familias y acordes compatibles',
            'Comparando las fragancias de nuestro catálogo',
            'Nuestro perfumista está creando tu selección',
            'Afinando los últimos detalles',
            'Tu experiencia Essenze está lista',
          ]}
        />
      ) : !showResults ? (
        <div className={styles.quizContainer}>
          <div className={styles.quizHeader}>
            <span className={styles.quizWatermark} aria-hidden="true">
              <EssenzeIcon name="bottle" />
            </span>
            <p className={styles.eyebrow}>Scent concierge</p>
            <h2 id="personalized-fragrance-title" className={styles.quizTitle}>
              Tu fragancia personalizada
            </h2>
            <p className={styles.quizSubtitle}>
              Cinco respuestas breves nos ayudan a interpretar tu estilo y a
              crear una selección olfativa pensada especialmente para ti.
            </p>

            <div
              className={styles.progressBarContainer}
              role="progressbar"
              aria-label="Progreso del cuestionario"
              aria-valuemin="1"
              aria-valuemax={FRAGRANCE_QUIZ_STEPS.length}
              aria-valuenow={currentStep}
            >
              <div
                className={styles.progressBar}
                style={{
                  width: `${
                    (currentStep / FRAGRANCE_QUIZ_STEPS.length) * 100
                  }%`,
                }}
              />
            </div>

            <div className={styles.stepNavigation} aria-label="Pasos del quiz">
              {FRAGRANCE_QUIZ_STEPS.map((step) => {
                const isActive = step.id === currentStep;
                const isCompleted = Boolean(selections[step.key]);
                return (
                  <button
                    key={step.id}
                    className={`${styles.stepButton} ${
                      isActive ? styles.stepButtonActive : ''
                    }`}
                    type="button"
                    onClick={() => {
                      if (step.id <= currentStep || isCompleted) {
                        setCurrentStep(step.id);
                      }
                    }}
                    disabled={step.id > currentStep && !isCompleted}
                    aria-current={isActive ? 'step' : undefined}
                  >
                    <span className={styles.stepIcon} aria-hidden="true">
                      <EssenzeIcon name={QUIZ_STEP_ICONS[step.key]} size={17} />
                    </span>
                    {step.eyebrow}
                  </button>
                );
              })}
            </div>
          </div>

          <div className={styles.questionContainer}>
            <div className={styles.questionTopline}>
              <span>
                Paso {currentStep} de {FRAGRANCE_QUIZ_STEPS.length}
              </span>
              <span>{currentQuestion?.eyebrow}</span>
            </div>

            <h3 className={styles.questionText}>{currentQuestion?.question}</h3>

            <div className={styles.optionsGrid}>
              {currentQuestion?.options.map((option) => {
                const isSelected = selectedValue === option.value;
                return (
                  <button
                    type="button"
                    key={option.value}
                    className={`${styles.optionButton} ${
                      isSelected ? styles.selected : ''
                    }`}
                    onClick={() =>
                      handleSelectOption(currentQuestion.key, option.value)
                    }
                    aria-pressed={isSelected}
                  >
                    <span className={styles.optionRadio} aria-hidden="true">
                      {isSelected ? '✓' : ''}
                    </span>
                    <span className={styles.optionLabel}>{option.label}</span>
                  </button>
                );
              })}
            </div>

            <div className={styles.actionButtons}>
              <button
                className={styles.buttonSecondary}
                onClick={handlePrevStep}
                disabled={currentStep === 1}
                type="button"
              >
                ← Atrás
              </button>

              {currentStep < FRAGRANCE_QUIZ_STEPS.length ? (
                <button
                  className={styles.buttonPrimary}
                  onClick={handleNextStep}
                  disabled={!selectedValue}
                  type="button"
                >
                  Siguiente →
                </button>
              ) : (
                <button
                  className={styles.buttonPrimary}
                  onClick={handleGetRecommendations}
                  disabled={!selectedValue || products.length === 0}
                  type="button"
                >
                  {selections.recipient === 'gift'
                    ? 'Encontrar el regalo perfecto'
                    : 'Descubrir mi fragancia'}
                </button>
              )}
            </div>

            {products.length === 0 ? (
              <p className={styles.catalogNotice} role="status">
                El catálogo no está disponible en este momento. Revisa el acceso
                Storefront de los productos y metacampos.
              </p>
            ) : null}
          </div>
        </div>
      ) : (
        <div className={styles.resultsContainer}>
          <div className={styles.resultsHeader}>
            <div>
              <p className={styles.eyebrowDark}>Selección Essenze</p>
              <h2 className={styles.resultsTitle}>
                Tu ADN olfativo
              </h2>
              <div className={styles.selectionList}>
                {selectionLabels.map((label) => (
                  <span key={label}>{label}</span>
                ))}
              </div>
            </div>

            <button
              className={styles.buttonSecondary}
              onClick={handleReset}
              type="button"
            >
              Repetir quiz
            </button>
          </div>

          <div className={styles.resultsIntro}>
            <p className={styles.resultsCount} aria-live="polite">
              {result.exactMatchCount > 0
                ? `${result.exactMatchCount} fragancia${
                    result.exactMatchCount === 1 ? '' : 's'
                  } con coincidencias en tu perfil`
                : 'Te mostramos las opciones más cercanas disponibles'}
            </p>
            {result.usedFallback ? (
              <p className={styles.fallbackNotice}>
                Completamos la selección con alternativas del catálogo para que
                siempre tengas opciones por descubrir.
              </p>
            ) : null}
          </div>

          {result.recommendations.length > 0 ? (
            <>
              <div className={styles.resultsGrid}>
                {result.recommendations.map((recommendation, index) => (
                  <RecommendationCard
                    key={recommendation.product.id}
                    recommendation={recommendation}
                    loading={index < 4 ? 'eager' : 'lazy'}
                  />
                ))}
              </div>

            </>
          ) : (
            <div className={styles.noResults}>
              <p className={styles.noResultsText}>
                Aún no hay productos disponibles para recomendar.
              </p>
              <p className={styles.noResultsHint}>
                Verifica que los productos estén publicados en el canal de venta
                Headless y que sus metacampos tengan acceso Storefront.
              </p>
              <button
                className={styles.buttonPrimary}
                onClick={handleReset}
                type="button"
              >
                Volver al quiz
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function AdvisorIntro({onStart}) {
  const benefits = [
    {title: 'Personalizado', copy: 'Según tu perfil', icon: 'sparkles'},
    {title: 'Experto', copy: 'Criterio olfativo', icon: 'bottle'},
    {title: 'Rápido', copy: 'Solo cinco pasos', icon: 'clock'},
    {title: 'Sin costo', copy: 'Siempre disponible', icon: 'heart'},
  ];

  return (
    <div className={styles.advisorIntro}>
      <div className={styles.advisorIntroCopy}>
        <p className={styles.advisorIntroEyebrow}>Asesor Essenze</p>
        <h2 id="personalized-fragrance-title">Descubre tu aroma perfecto</h2>
        <p>Nuestro asesor olfativo analizará tu estilo y seleccionará las fragancias que mejor conectan contigo o con la persona a quien deseas sorprender.</p>
        <button className={styles.advisorStartButton} type="button" onClick={onStart}>
          Comenzar experiencia <span aria-hidden="true">→</span>
        </button>
      </div>
      <div className={styles.advisorBenefits} aria-label="Beneficios del asesor">
        {benefits.map(({title, copy, icon}) => (
          <article key={title} className={styles.advisorBenefit}>
            <span className={styles.advisorBenefitIcon} aria-hidden="true">
              <EssenzeIcon name={icon} size={22} />
            </span>
            <strong>{title}</strong>
            <small>{copy}</small>
          </article>
        ))}
      </div>
    </div>
  );
}

function RecommendationCard({recommendation, loading}) {
  const {product, percentage, matchDetails, isFallback} = recommendation;
  const badges = matchDetails.slice(0, 2).map((match) => ({
    label: match.label,
    tone: 'neutral',
    key: match.key,
  }));

  const affinityLabel = isFallback
    ? 'Seleccionada especialmente para ti'
    : `${percentage}% de afinidad · Elegida para ti`;

  return (
    <UnifiedProductCard
      available={product.availableForSale !== false}
      badges={badges}
      dataProductId={product.id}
      image={product.featuredImage}
      loading={loading}
      topBadge={{label: affinityLabel, tone: 'success'}}
      price={
        product.priceRange?.minVariantPrice ? (
          <Money data={product.priceRange.minVariantPrice} />
        ) : (
          'Consultar precio'
        )
      }
      productType={product.productType || 'Perfumería selecta'}
      sizes="(min-width: 1200px) 25vw, (min-width: 700px) 50vw, 100vw"
      title={product.title}
      to={`/products/${product.handle}`}
      vendor={product.vendor}
    />
  );
}
