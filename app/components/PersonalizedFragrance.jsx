/**
 * PersonalizedFragrance.jsx
 * 
 * Quiz de 3 pasos para personalizar fragancia
 * - Filtra productos reales basado en selecciones
 * - Muestra resultados con ProductCard
 * - 100% funcional
 */

import { useState } from 'react';
import ProductCard from '~/components/ProductCard';

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

  /**
   * Seleccionar una opción
   */
  const handleSelectOption = (key, value) => {
    setSelections(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  /**
   * Ir al siguiente paso
   */
  const handleNextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  /**
   * Volver al paso anterior
   */
  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  /**
   * Filtrar productos basado en selecciones
   * Un producto debe tener AL MENOS 2 de los 3 criterios
   */
  const handleGetRecommendations = () => {
    const { gender, family, occasion } = selections;

    // Crear array de tags a buscar
    const selectedTags = [];
    if (gender) selectedTags.push(gender);
    if (family) selectedTags.push(family);
    if (occasion) selectedTags.push(occasion);

    // Filtrar productos
    const filtered = products.filter(product => {
      if (!product.tags || product.tags.length === 0) {
        return false;
      }

      // Contar cuántos tags coinciden
      const matchCount = selectedTags.filter(tag => 
        product.tags.some(productTag => 
          productTag.toLowerCase() === tag.toLowerCase()
        )
      ).length;

      // Retornar solo si hay 2 o más matches
      return matchCount >= 2;
    });

    setFilteredProducts(filtered);
    setShowResults(true);
  };

  /**
   * Reiniciar quiz
   */
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

  /**
   * Obtener el paso actual
   */
  const currentQuestion = STEPS.find(step => step.id === currentStep);

  return (
    <section className="personalized-fragrance-section">
      <div className="container">
        {!showResults ? (
          // QUIZ
          <div className="quiz-container">
            <div className="quiz-header">
              <h2 className="quiz-title">Tu Fragancia Personalizada</h2>
              <p className="quiz-subtitle">
                Responde 3 preguntas y encontraremos tu fragancia perfecta
              </p>

              {/* Progress bar */}
              <div className="quiz-progress">
                <div 
                  className="quiz-progress-bar"
                  style={{
                    width: `${(currentStep / 3) * 100}%`,
                  }}
                />
              </div>
              <p className="quiz-step-counter">
                Paso {currentStep} de 3
              </p>
            </div>

            {/* Pregunta actual */}
            <div className="quiz-question">
              <h3 className="question-text">
                {currentQuestion?.question}
              </h3>

              {/* Opciones */}
              <div className="quiz-options">
                {currentQuestion?.options.map(option => (
                  <button
                    key={option.value}
                    className={`quiz-option ${
                      selections[currentQuestion.key] === option.value
                        ? 'selected'
                        : ''
                    }`}
                    onClick={() =>
                      handleSelectOption(currentQuestion.key, option.value)
                    }
                  >
                    <span className="option-radio">
                      {selections[currentQuestion.key] === option.value && '✓'}
                    </span>
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Botones de navegación */}
            <div className="quiz-actions">
              <button
                className="button secondary"
                onClick={handlePrevStep}
                disabled={currentStep === 1}
              >
                ← Atrás
              </button>

              {currentStep < 3 ? (
                <button
                  className="button primary"
                  onClick={handleNextStep}
                  disabled={!selections[currentQuestion.key]}
                >
                  Siguiente →
                </button>
              ) : (
                <button
                  className="button primary"
                  onClick={handleGetRecommendations}
                  disabled={!selections[currentQuestion.key]}
                >
                  Ver Mis Recomendaciones
                </button>
              )}
            </div>
          </div>
        ) : (
          // RESULTADOS
          <div className="results-container">
            <div className="results-header">
              <h2 className="results-title">Tus Recomendaciones Personalizadas</h2>
              <p className="results-subtitle">
                Basado en tus preferencias: {selections.gender}, {selections.family}, {selections.occasion}
              </p>

              <button 
                className="button secondary"
                onClick={handleReset}
              >
                Hacer Quiz Nuevamente
              </button>
            </div>

            {filteredProducts.length > 0 ? (
              <>
                <p className="results-count">
                  Encontramos {filteredProducts.length} fragancia{filteredProducts.length !== 1 ? 's' : ''} perfecta{filteredProducts.length !== 1 ? 's' : ''} para ti
                </p>

                <div className="results-grid">
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
              <div className="no-results">
                <p className="no-results-text">
                  No encontramos fragancias que coincidan exactamente con tus preferencias.
                </p>
                <p className="no-results-hint">
                  Intenta cambiar tus selecciones y busca nuevamente.
                </p>

                <button 
                  className="button primary"
                  onClick={handleReset}
                >
                  Intentar de Nuevo
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        .personalized-fragrance-section {
          padding: var(--space-10) 0;
          background: var(--bg-page);
        }

        .quiz-container {
          max-width: 800px;
          margin: 0 auto;
          padding: var(--space-8);
          background: var(--color-white);
          border-radius: var(--radius-lg);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
        }

        .quiz-header {
          text-align: center;
          margin-bottom: var(--space-10);
        }

        .quiz-title {
          font-family: var(--font-display);
          font-size: var(--text-h2);
          color: var(--text-body);
          margin: 0 0 var(--space-2) 0;
          font-weight: 700;
        }

        .quiz-subtitle {
          font-size: var(--text-body-md);
          color: var(--text-muted);
          margin: 0 0 var(--space-8) 0;
        }

        .quiz-progress {
          height: 6px;
          background: var(--color-border);
          border-radius: var(--radius-pill);
          overflow: hidden;
          margin-bottom: var(--space-4);
        }

        .quiz-progress-bar {
          height: 100%;
          background: linear-gradient(90deg, var(--color-ink) 0%, var(--color-gold-legacy) 100%);
          transition: width 0.3s ease;
          border-radius: var(--radius-pill);
        }

        .quiz-step-counter {
          font-size: var(--text-body-sm);
          color: var(--text-muted);
          margin: 0;
        }

        .quiz-question {
          margin-bottom: var(--space-10);
        }

        .question-text {
          font-size: var(--text-h3);
          color: var(--text-body);
          margin: 0 0 var(--space-6) 0;
          text-align: center;
          font-weight: 600;
        }

        .quiz-options {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: var(--space-4);
        }

        .quiz-option {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          padding: var(--space-4);
          border: 2px solid var(--color-border);
          border-radius: var(--radius-md);
          background: var(--color-white);
          cursor: pointer;
          transition: all 0.3s ease;
          font-size: var(--text-body-md);
          color: var(--text-body);
          font-weight: 500;
          text-align: left;
        }

        .quiz-option:hover {
          border-color: var(--color-gold-legacy);
          background: var(--color-surface);
        }

        .quiz-option.selected {
          border-color: var(--color-ink);
          background: var(--color-ink);
          color: var(--color-white);
        }

        .option-radio {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          border: 2px solid currentColor;
          border-radius: 50%;
          font-size: 14px;
          font-weight: bold;
          flex-shrink: 0;
        }

        .quiz-option.selected .option-radio {
          background: var(--color-white);
          color: var(--color-ink);
          border-color: var(--color-white);
        }

        .quiz-actions {
          display: flex;
          gap: var(--space-4);
          justify-content: center;
          margin-top: var(--space-8);
        }

        .button {
          min-width: 150px;
        }

        .button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Resultados */
        .results-container {
          max-width: 1200px;
          margin: 0 auto;
        }

        .results-header {
          text-align: center;
          margin-bottom: var(--space-10);
          padding: var(--space-8);
          background: var(--color-white);
          border-radius: var(--radius-lg);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
        }

        .results-title {
          font-family: var(--font-display);
          font-size: var(--text-h2);
          color: var(--text-body);
          margin: 0 0 var(--space-2) 0;
          font-weight: 700;
        }

        .results-subtitle {
          font-size: var(--text-body-md);
          color: var(--text-muted);
          margin: 0 0 var(--space-6) 0;
        }

        .results-count {
          font-size: var(--text-body-md);
          color: var(--text-body);
          margin: var(--space-6) 0;
          text-align: center;
          font-weight: 500;
        }

        .results-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: var(--space-6);
          margin-top: var(--space-8);
        }

        .no-results {
          padding: var(--space-10);
          background: var(--color-surface);
          border-radius: var(--radius-lg);
          text-align: center;
        }

        .no-results-text {
          font-size: var(--text-body-lg);
          color: var(--text-body);
          margin: 0 0 var(--space-2) 0;
          font-weight: 500;
        }

        .no-results-hint {
          font-size: var(--text-body-md);
          color: var(--text-muted);
          margin: 0 0 var(--space-6) 0;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .quiz-container {
            padding: var(--space-6);
            margin: 0;
          }

          .quiz-options {
            grid-template-columns: 1fr;
          }

          .quiz-actions {
            flex-direction: column;
          }

          .button {
            width: 100%;
          }

          .results-grid {
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: var(--space-4);
          }
        }

        @media (max-width: 480px) {
          .quiz-title {
            font-size: var(--text-h3);
          }

          .question-text {
            font-size: var(--text-body-lg);
          }

          .quiz-options {
            gap: var(--space-3);
          }

          .quiz-option {
            padding: var(--space-3);
            font-size: var(--text-body-sm);
          }

          .results-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </section>
  );
}

/**
 * PROPS:
 * 
 * products: array de productos de Shopify
 *   [
 *     {
 *       id: string,
 *       title: string,
 *       handle: string,
 *       tags: ['masculine', 'floral', 'daily'],
 *       priceRange: { minVariantPrice: { amount: string } },
 *       featuredImage: { url: string }
 *     }
 *   ]
 * 
 * TAGS REQUERIDOS EN SHOPIFY:
 * 
 * Género olfativo:
 * - masculine
 * - feminine
 * - unisex
 * - adventurous
 * 
 * Familia aromática:
 * - floral
 * - amber
 * - citric
 * - oriental
 * 
 * Ocasión:
 * - daily
 * - work
 * - night
 * - special
 * 
 * EJEMPLO DE USO:
 * 
 * <PersonalizedFragrance products={allProducts} />
 * 
 * CÓMO FUNCIONA:
 * 
 * 1. Usuario responde 3 preguntas
 * 2. Se filtran productos que tengan AL MENOS 2 tags coincidentes
 * 3. Se muestran resultados con ProductCard
 * 4. Usuario puede hacer quiz nuevamente
 */