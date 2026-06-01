/**
 * ==========================================================================
 * CALCULADORA INTERACTIVA - ARQUITECTURA LIMPIA EN JS ES5
 * ==========================================================================
 * 
 * Estructura de Capas (SOLID):
 * 1. Capa de Dominio (CalculatorEngine): Lógica matemática pura.
 * 2. Capa de Datos (HistoryRepository): Persistencia local en localStorage.
 * 3. Capa de Presentación - Vista (CalculatorView): Manipulación limpia del DOM.
 * 4. Capa de Presentación - Controlador (CalculatorController): Orquestación del flujo.
 */

// --------------------------------------------------------------------------
// 1. CAPA DE DOMINIO: Motor de Cálculos (CalculatorEngine)
// --------------------------------------------------------------------------
function CalculatorEngine() {}

/**
 * Realiza la operación matemática básica especificada.
 * @param {string} num1 - Primer operando.
 * @param {string} num2 - Segundo operando.
 * @param {string} operator - Carácter de operación (+, -, *, /).
 * @returns {number|string} Resultado formateado o mensaje de error.
 */
CalculatorEngine.prototype.calculate = function(num1, num2, operator) {
  var a = parseFloat(num1);
  var b = parseFloat(num2);

  if (isNaN(a) || isNaN(b)) {
    return 'Error';
  }

  var result;
  switch (operator) {
    case '+':
      result = a + b;
      break;
    case '-':
      result = a - b;
      break;
    case '*':
      result = a * b;
      break;
    case '/':
      if (b === 0) {
        return 'Error: Div/0'; // Protección contra división por cero
      }
      result = a / b;
      break;
    default:
      return 'Error';
  }

  // Corregir problemas de coma flotante nativos de JS (p. ej., 0.1 + 0.2)
  return this._normalizePrecision(result);
};

/**
 * Normaliza la precisión de los decimales de un número de punto flotante.
 * Evita la visualización de precisiones erróneas como 0.30000000000000004.
 * @param {number} value - El número resultante a formatear.
 * @returns {number} Número normalizado.
 * @private
 */
CalculatorEngine.prototype._normalizePrecision = function(value) {
  if (typeof value !== 'number') {
    return value;
  }
  // Limitamos la salida a un máximo de 10 dígitos decimales de precisión
  var precision = 10;
  var factor = Math.pow(10, precision);
  return Math.round(value * factor) / factor;
};


// --------------------------------------------------------------------------
// 2. CAPA DE DATOS: Repositorio del Historial (HistoryRepository)
// --------------------------------------------------------------------------
/**
 * Gestiona el almacenamiento persistente del historial.
 * @param {string} storageKey - Nombre de la clave de localStorage.
 */
function HistoryRepository(storageKey) {
  this.storageKey = storageKey || 'calcupro_history_items';
}

/**
 * Recupera todas las operaciones guardadas en el historial.
 * @returns {Array} Listado de expresiones guardadas en formato string.
 */
HistoryRepository.prototype.getAll = function() {
  var data = localStorage.getItem(this.storageKey);
  if (!data) {
    return [];
  }
  try {
    return JSON.parse(data);
  } catch (error) {
    // Si hay datos corruptos, devolvemos un array vacío
    return [];
  }
};

/**
 * Guarda una nueva operación completada en el historial persistente.
 * @param {string} calculationString - La representación visual de la operación (ej. "5 + 3 = 8").
 */
HistoryRepository.prototype.save = function(calculationString) {
  var history = this.getAll();
  history.push(calculationString);
  localStorage.setItem(this.storageKey, JSON.stringify(history));
};

/**
 * Borra permanentemente todo el historial del almacenamiento local.
 */
HistoryRepository.prototype.clear = function() {
  localStorage.removeItem(this.storageKey);
};


// --------------------------------------------------------------------------
// 3. CAPA DE PRESENTACIÓN: Vista DOM (CalculatorView)
// --------------------------------------------------------------------------
function CalculatorView() {
  // Referencias a elementos del DOM
  this.screenValue = document.getElementById('screen-value');
  this.screenExpression = document.getElementById('screen-expression');
  this.historyList = document.getElementById('history-list');
  this.historyEmpty = document.getElementById('history-empty');
  this.btnClearHistory = document.getElementById('btn-clear-history');
}

/**
 * Actualiza la información visual en el display de la calculadora.
 * @param {string} current - Número principal activo o resultado.
 * @param {string} expression - La operación parcial actual en la línea superior.
 */
CalculatorView.prototype.updateScreen = function(current, expression) {
  this.screenValue.textContent = current || '0';
  this.screenExpression.textContent = expression || '';
};

/**
 * Renderiza el listado visual del historial.
 * @param {Array} historyItems - Colección de operaciones.
 * @param {Function} onItemClick - Callback activado al hacer clic sobre un cálculo.
 */
CalculatorView.prototype.renderHistory = function(historyItems, onItemClick) {
  var self = this;
  // Limpiamos los elementos previos de la lista
  this.historyList.innerHTML = '';

  // Controlar visibilidad del contenedor según haya datos o no
  if (historyItems.length === 0) {
    this.historyEmpty.style.display = 'flex';
    this.btnClearHistory.style.display = 'none';
    return;
  }

  this.historyEmpty.style.display = 'none';
  this.btnClearHistory.style.display = 'flex';

  // Pintar los elementos en orden descendente (el más reciente al inicio)
  for (var i = historyItems.length - 1; i >= 0; i--) {
    var calculation = historyItems[i];
    var li = document.createElement('li');
    li.className = 'history-item';

    // Dividimos la operación del resultado para darles estilos diferentes
    var parts = calculation.split('=');
    var exprText = parts[0] ? parts[0].trim() + ' =' : '';
    var resText = parts[1] ? parts[1].trim() : '';

    var exprSpan = document.createElement('span');
    exprSpan.className = 'history-item-expr';
    exprSpan.textContent = exprText;

    var resSpan = document.createElement('span');
    resSpan.className = 'history-item-res';
    resSpan.textContent = resText;

    li.appendChild(exprSpan);
    li.appendChild(resSpan);

    // Evento de restauración: Usamos una clausura clásica de ES5 para vincular el resultado actual
    (function(resultValue) {
      li.addEventListener('click', function() {
        if (onItemClick) {
          onItemClick(resultValue);
        }
      });
    })(resText);

    this.historyList.appendChild(li);
  }
};


// --------------------------------------------------------------------------
// 4. CAPA DE PRESENTACIÓN: Controlador de Flujo (CalculatorController)
// --------------------------------------------------------------------------
/**
 * Conecta las interacciones de la Vista con la lógica matemática y la persistencia.
 * @param {CalculatorEngine} engine - Motor matemático (Dominio).
 * @param {HistoryRepository} repository - Acceso a datos de persistencia.
 * @param {CalculatorView} view - Gestor de interfaz visual (DOM).
 */
function CalculatorController(engine, repository, view) {
  this.engine = engine;
  this.repository = repository;
  this.view = view;

  // Estado del flujo de la calculadora
  this.currentInput = '0';            // Dígitos actuales en pantalla
  this.previousInput = '';           // Operando anterior en memoria
  this.activeOperator = '';          // Operador matemático activo
  this.isCalculationCompleted = false; // Flag para resetear pantalla en la próxima pulsación

  this.init();
}

/**
 * Inicializa los manejadores y renderiza el historial inicial.
 */
CalculatorController.prototype.init = function() {
  this.setupEventHandlers();
  this.refreshHistory();
};

/**
 * Asocia todos los listeners para interactuar con la interfaz del usuario.
 */
CalculatorController.prototype.setupEventHandlers = function() {
  var self = this;

  // Delegación de eventos en el keypad de la calculadora
  var keypad = document.querySelector('.calculator-keypad');
  if (keypad) {
    keypad.addEventListener('click', function(event) {
      var target = event.target;
      if (!target.classList.contains('btn')) {
        return;
      }

      // Procesar clics según el tipo de botón
      if (target.hasAttribute('data-number')) {
        self.handleNumberInput(target.getAttribute('data-number'));
      } else if (target.hasAttribute('data-operator')) {
        self.handleOperatorInput(target.getAttribute('data-operator'));
      } else if (target.hasAttribute('data-decimal')) {
        self.handleDecimalInput();
      } else if (target.hasAttribute('data-action')) {
        var action = target.getAttribute('data-action');
        if (action === 'clear') {
          self.handleClear();
        } else if (action === 'backspace') {
          self.handleBackspace();
        } else if (action === 'equals') {
          self.handleEquals();
        }
      }

      // Actualizar la pantalla después de procesar la entrada
      self.updateDisplay();
    });
  }

  // Listener para el botón de vaciar historial
  this.view.btnClearHistory.addEventListener('click', function() {
    self.handleClearHistory();
  });

  // Listener de soporte para entrada desde teclado físico
  document.addEventListener('keydown', function(event) {
    self.handleKeyboardInput(event);
  });
};

/**
 * Procesa la pulsación de un número de 0 a 9.
 * @param {string} number - Dígito presionado.
 */
CalculatorController.prototype.handleNumberInput = function(number) {
  // Si la pantalla muestra 0, un error anterior o acabamos de pulsar '=', se sobrescribe
  if (this.currentInput === '0' || this.isCalculationCompleted || this.currentInput.indexOf('Error') !== -1) {
    this.currentInput = number;
    this.isCalculationCompleted = false;
  } else {
    // Limitamos la entrada a 14 caracteres para no desbordar visualmente el display
    if (this.currentInput.length < 14) {
      this.currentInput += number;
    }
  }
};

/**
 * Procesa la pulsación de un operador (+, -, *, /).
 * @param {string} operator - El operador matemático seleccionado.
 */
CalculatorController.prototype.handleOperatorInput = function(operator) {
  // Si hay un error activo, impedimos nuevas operaciones hasta presionar Clear
  if (this.currentInput.indexOf('Error') !== -1) {
    return;
  }

  // Si ya tenemos una operación pendiente en cola, hacemos el cálculo intermedio automáticamente
  if (this.activeOperator && !this.isCalculationCompleted) {
    var intermediateResult = this.engine.calculate(
      this.previousInput,
      this.currentInput,
      this.activeOperator
    );

    // Si ocurre un error (ej: división por cero), paramos la secuencia
    if (intermediateResult.toString().indexOf('Error') !== -1) {
      this.currentInput = intermediateResult.toString();
      this.previousInput = '';
      this.activeOperator = '';
      this.isCalculationCompleted = true;
      return;
    }

    this.previousInput = intermediateResult.toString();
  } else {
    this.previousInput = this.currentInput;
  }

  this.activeOperator = operator;
  this.currentInput = '0';
  this.isCalculationCompleted = false;
};

/**
 * Agrega el punto decimal al operando actual si no tiene uno.
 */
CalculatorController.prototype.handleDecimalInput = function() {
  if (this.isCalculationCompleted || this.currentInput.indexOf('Error') !== -1) {
    this.currentInput = '0.';
    this.isCalculationCompleted = false;
    return;
  }

  // Evita que el usuario añada múltiples puntos decimales en un mismo número
  if (this.currentInput.indexOf('.') === -1) {
    this.currentInput += '.';
  }
};

/**
 * Procesa la evaluación final de la expresión matemática (=).
 */
CalculatorController.prototype.handleEquals = function() {
  // Solo evaluamos si existe un operador activo y operandos definidos
  if (!this.activeOperator || !this.previousInput) {
    return;
  }

  var operand1 = this.previousInput;
  var operand2 = this.currentInput;
  var op = this.activeOperator;

  var result = this.engine.calculate(operand1, operand2, op);

  // Formateo estético del operador para la visualización del historial
  var opVisual = op;
  if (op === '*') opVisual = '×';
  if (op === '/') opVisual = '÷';

  var calculationText = operand1 + ' ' + opVisual + ' ' + operand2 + ' = ' + result;

  // Actualizar estados internos
  this.currentInput = result.toString();
  this.previousInput = '';
  this.activeOperator = '';
  this.isCalculationCompleted = true;

  // Solo guardamos en el historial de almacenamiento local si es un resultado válido (no error)
  if (result.toString().indexOf('Error') === -1) {
    this.repository.save(calculationText);
    this.refreshHistory();
  }
};

/**
 * Resetea completamente el estado interno de la calculadora.
 */
CalculatorController.prototype.handleClear = function() {
  this.currentInput = '0';
  this.previousInput = '';
  this.activeOperator = '';
  this.isCalculationCompleted = false;
};

/**
 * Borra el último dígito ingresado en la pantalla.
 */
CalculatorController.prototype.handleBackspace = function() {
  if (this.isCalculationCompleted || this.currentInput.indexOf('Error') !== -1) {
    this.handleClear();
    return;
  }

  if (this.currentInput.length > 1) {
    this.currentInput = this.currentInput.slice(0, -1);
  } else {
    this.currentInput = '0';
  }
};

/**
 * Vacía el historial de operaciones local y en memoria, y actualiza el panel lateral.
 */
CalculatorController.prototype.handleClearHistory = function() {
  this.repository.clear();
  this.refreshHistory();
};

/**
 * Actualiza la información que se muestra en el display visual de la calculadora.
 */
CalculatorController.prototype.updateDisplay = function() {
  var expressionDisplay = '';
  if (this.previousInput && this.activeOperator) {
    var opVisual = this.activeOperator;
    if (opVisual === '*') opVisual = '×';
    if (opVisual === '/') opVisual = '÷';
    expressionDisplay = this.previousInput + ' ' + opVisual;
  }

  this.view.updateScreen(this.currentInput, expressionDisplay);
};

/**
 * Actualiza la lista del historial recuperándola del repositorio.
 */
CalculatorController.prototype.refreshHistory = function() {
  var self = this;
  var items = this.repository.getAll();
  
  this.view.renderHistory(items, function(restoredValue) {
    // Al pulsar una fila del historial, el resultado se carga de nuevo en la pantalla
    self.currentInput = restoredValue;
    self.isCalculationCompleted = true;
    self.updateDisplay();
  });
};

/**
 * Maneja la interacción a través de un teclado de hardware.
 * @param {KeyboardEvent} event - Evento nativo de teclado.
 */
CalculatorController.prototype.handleKeyboardInput = function(event) {
  var key = event.key;

  // Mapear números del teclado
  if (/^[0-9]$/.test(key)) {
    this.handleNumberInput(key);
  }
  // Mapear punto y coma
  else if (key === '.' || key === ',') {
    this.handleDecimalInput();
  }
  // Mapear operadores aritméticos básicos
  else if (key === '+' || key === '-' || key === '*' || key === '/') {
    event.preventDefault(); // Previene comportamientos de scroll
    this.handleOperatorInput(key);
  }
  // Mapear Enter y tecla '=' para calcular resultado
  else if (key === 'Enter' || key === '=') {
    event.preventDefault();
    this.handleEquals();
  }
  // Mapear borrado (Backspace y Delete/Escape)
  else if (key === 'Backspace') {
    this.handleBackspace();
  } else if (key === 'Escape') {
    this.handleClear();
  }

  this.updateDisplay();
};


// --------------------------------------------------------------------------
// INICIALIZACIÓN DE LA APLICACIÓN
// --------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', function() {
  // Inicialización de dependencias
  var engine = new CalculatorEngine();
  var repository = new HistoryRepository();
  var view = new CalculatorView();

  // Inyección de dependencias para cumplir con SOLID (DIP)
  new CalculatorController(engine, repository, view);
});
