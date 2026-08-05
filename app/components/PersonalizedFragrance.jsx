/**
 * PersonalizedFragrance_DS.jsx
 * Quiz de 3 pasos para personalizar fragancia
 * - Design System Essenze
 * - CSS Modules
 * - Premium styling
 * - Responsive
 */

import { useState } from 'react';
import ProductCard from '~/components/ProductCard';
import styles from '~/styles/PersonalizedFragrance.module.css';

const STEPS = [
  {
    id: 1,
    question: '¿Cuál es tu género olfativo?',
    options: [
      { label: 'Masculino', value: 'masculine' },
      { label: 'Femenino', value: 'feminine' },
      { label: 'Unisex', value: 'unisex' },
      { label: 'Aventurero', value: 'adventurous' },
    ],
    key: 'gender',
  },
  {
    id: 2,
    question: '¿Qué familia aromática te atrae?',
    options: [
      { label: 'Floral', value: 'floral' },
      { label: 'Ámbar', value: 'amber' },
      { label: 'Cítrico', value: 'citric' },
      { label: 'Oriental', value: 'oriental' },
    ],
    key: 'family',
  },
  {
    id: 3,
    question: '¿Para qué ocasión?',
    options: [
      { label: 'Diario', value: 'daily' },
      { label: 'Trabajo', value: 'work' },
      { label: 'Noche', value: 'night' },
      { label: 'Especial', value: 'special' },
    ],
    key: 'occasion',
  },
];

export default function PersonalizedFragrance({ products = [] }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [selections, setSelections] = useState({
    gender: null,
    family: null,
    occasion: null,
  });
  const [showResults, setShowResults] = useState(false);
  const [filteredProducts, setFilteredProducts] = useState([]);

  const handleSelectOption = (key, value) => {
    setSelections(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleNextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleGetRecommendations = () => {
    const { gender, family, occasion } = selections;

    const selectedTags = [];
    if (gender) selectedTags.push(gender);
    if (family) selectedTags.push(family);
    if (occasion) selectedTags.push(occasion);

    const filtered = products.filter(product => {
      if (!product.tags || product.tags.length === 0) {
        return false;
      }

      const matchCount = selectedTags.filter(tag => 
        product.tags.some(productTag => 
          productTag.toLowerCase() === tag.toLowerCase()
        )
      ).length;

      return matchCount >= 2;
    });

    setFilteredProducts(filtered);
    setShowResults(true);
  };

  const handleReset = () => {
    setCurrentStep(1);
    setSelections({
      gender: null,
      family: null,
      occasion: null,
    });
    setShowResults(false);
    setFilteredProducts([]);
  };

  const currentQuestion = STEPS.find(step => step.id === currentStep);

  return (
    <section className={styles.section}>
      {!showResults ? (
        // QUIZ
        <div className={styles.quizContainer}>
          <div className={styles.quizHeader}>
            <h2 className={styles.quizTitle}>Tu Fragancia Personalizada</h2>
            <p className={styles.quizSubtitle}>
              Responde 3 preguntas y encontraremos tu fragancia perfecta
            </p>

            {/* Progress bar */}
            <div className={styles.progressBarContainer}>
              <div 
                className={styles.progressBar}
                style={{
                  width: `${(currentStep / 3) * 100}%`,
                }}
              />
            </div>
            <p className={styles.stepCounter}>
              Paso {currentStep} de 3
            </p>
          </div>

          {/* Pregunta actual */}
          <div className={styles.questionContainer}>
            <h3 className={styles.questionText}>
              {currentQuestion?.question}
            </h3>

            {/* Opciones */}
            <div className={styles.optionsGrid}>
              {currentQuestion?.options.map(option => (
                <button
                  key={option.value}
                  className={`${styles.optionButton} ${
                    selections[currentQuestion.key] === option.value
                      ? styles.selected
                      : ''
                  }`}
                  onClick={() =>
                    handleSelectOption(currentQuestion.key, option.value)
                  }
                  type="button"
                  aria-label={`Select ${option.label}`}
                >
                  <span className={styles.optionRadio}>
                    {selections[currentQuestion.key] === option.value && '✓'}
                  </span>
                  <span className={styles.optionLabel}>{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Botones de navegación */}
          <div className={styles.actionButtons}>
            <button
              className={styles.buttonSecondary}
              onClick={handlePrevStep}
              disabled={currentStep === 1}
              type="button"
            >
              ← Atrás
            </button>

            {currentStep < 3 ? (
              <button
                className={styles.buttonPrimary}
                onClick={handleNextStep}
                disabled={!selections[currentQuestion.key]}
                type="button"
              >
                Siguiente →
              </button>
            ) : (
              <button
                className={styles.buttonPrimary}
                onClick={handleGetRecommendations}
                disabled={!selections[currentQuestion.key]}
                type="button"
              >
                Ver Mis Recomendaciones
              </button>
            )}
          </div>
        </div>
      ) : (
        // RESULTADOS
        <div className={styles.resultsContainer}>
          <div className={styles.resultsHeader}>
            <h2 className={styles.resultsTitle}>Tus Recomendaciones Personalizadas</h2>
            <p className={styles.resultsSubtitle}>
              Basado en tus preferencias: <span className={styles.selectionHighlight}>{selections.gender}, {selections.family}, {selections.occasion}</span>
            </p>

            <button 
              className={styles.buttonSecondary}
              onClick={handleReset}
              type="button"
            >
              Hacer Quiz Nuevamente
            </button>
          </div>

          {filteredProducts.length > 0 ? (
            <>
              <p className={styles.resultsCount}>
                Encontramos {filteredProducts.length} fragancia{filteredProducts.length !== 1 ? 's' : ''} perfecta{filteredProducts.length !== 1 ? 's' : ''} para ti
              </p>

              <div className={styles.resultsGrid}>
                {filteredProducts.map(product => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onClick={(prod) => {
                      window.location.href = `/products/${prod.handle}`;
                    }}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className={styles.noResults}>
              <p className={styles.noResultsText}>
                No encontramos fragancias que coincidan exactamente con tus preferencias.
              </p>
              <p className={styles.noResultsHint}>
                Intenta cambiar tus selecciones y busca nuevamente.
              </p>

              <button 
                className={styles.buttonPrimary}
                onClick={handleReset}
                type="button"
              >
                Intentar de Nuevo
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}