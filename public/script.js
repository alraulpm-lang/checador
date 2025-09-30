document.addEventListener("DOMContentLoaded", () => {
  // --- Configuración ---
  const GOOGLE_SHEET_CSV_URL =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vQUkZZSIVv2DdmP22Okp_GEjqGaKU6IikB9oiL4oZF2x9VYHqXMo48if_Du6VM67SE2MF-8YRfW-YP2/pub?gid=677583262&single=true&output=csv"; // ¡IMPORTANTE! Reemplaza con tu URL
  let productDatabase = []; // Aquí almacenaremos los productos cargados del Sheet

  // --- Elementos del DOM ---
  const scannerView = document.getElementById("scanner-view");
  const productDetailsView = document.getElementById("product-details-view");
  const backButton = document.getElementById("back-button");
  const scannerFeedback = document.getElementById("scanner-feedback");

  const productImage = document.getElementById("product-image");
  const productName = document.getElementById("product-name");
  const productPrice = document.getElementById("product-price");
  const productDescription = document.getElementById("product-description");
  const productSKU = document.getElementById("product-sku");

  // --- Funciones de Utilidad ---

  // Cambia la vista activa (escáner o detalles)
  function switchView(viewId) {
    scannerView.classList.remove("active");
    productDetailsView.classList.remove("active");
    document.getElementById(viewId).classList.add("active");
  }

  // Muestra mensajes en la vista del escáner
  function showScannerFeedback(message, type = "info") {
    scannerFeedback.textContent = message;
    scannerFeedback.className = `feedback ${type}`; // Para aplicar estilos si es error, éxito, etc.
  }

  // --- Carga de Datos del Google Sheet ---
  async function loadProductData() {
    showScannerFeedback("Cargando productos...", "info");
    try {
      const response = await fetch(GOOGLE_SHEET_CSV_URL);
      const csvText = await response.text();
      productDatabase = parseCSV(csvText);
      showScannerFeedback(
        `Productos cargados (${productDatabase.length}). Listo para escanear.`,
        "success"
      );
      console.log("Base de datos de productos cargada:", productDatabase);
    } catch (error) {
      console.error("Error al cargar la base de datos de productos:", error);
      showScannerFeedback(
        "Error al cargar productos. Inténtalo de nuevo más tarde.",
        "error"
      );
      // Aquí podrías intentar recargar o mostrar un botón de reintento
    }
  }

  // Función simple para parsear CSV (asume la primera fila son encabezados)
// Función simple para parsear CSV (asume la primera fila son encabezados)
  function parseCSV(csv) {
    // FIX: Se usa una expresión regular para aceptar saltos de línea de Windows (\r\n) y Unix (\n)
    const lines = csv.split(/\r?\n/);
    
    if (lines.length < 2) return []; // Si no hay datos, retorna un array vacío

    const headers = lines[0].split(",").map((header) => header.trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      // Ignorar líneas vacías al final del archivo
      if (lines[i].trim() === "") continue;

      const currentline = lines[i].split(",");
      if (currentline.length === headers.length) {
        const item = {};
        for (let j = 0; j < headers.length; j++) {
          // Asigna el valor a la propiedad correspondiente del objeto.
          // Ej: item['CODIGO_BARRAS'] = '750...'
          item[headers[j]] = currentline[j].trim();
        }
        data.push(item);
      }
    }
    return data;
  }

  // --- Búsqueda y Actualización de Detalles ---
  function findProductAndDisplay(barcode) {
    const product = productDatabase.find((p) => p.CODIGO_BARRAS === barcode);

    if (product) {
      productImage.src =
        product.IMAGEN_URL ||
        "https://via.placeholder.com/200x200?text=Sin+Imagen";
      productName.textContent = product.NOMBRE;
      productPrice.textContent = `$${parseFloat(product.PRECIO || 0).toFixed(
        2
      )}`;
      productDescription.textContent =
        product.DESCRIPCION || "Sin descripción disponible.";
      productSKU.textContent = product.CODIGO_BARRAS; // O un SKU diferente si tienes una columna SKU
      switchView("product-details-view");
    } else {
      showScannerFeedback(
        `Producto con código ${barcode} no encontrado.`,
        "error"
      );
      // Permanecer en la vista del escáner y notificar
    }
  }

  // --- Inicialización del Escáner QuaggaJS ---
  function initializeScanner() {
    Quagga.init(
      {
        inputStream: {
          name: "Live",
          type: "LiveStream",
          target: document.querySelector("#interactive"), // El elemento donde se mostrará el video
          constraints: {
            width: 640,
            height: 480,
            facingMode: "environment", // Usa la cámara trasera si está disponible
          },
        },
        decoder: {
          readers: [
            "ean_reader",
            "upc_reader",
            "code_128_reader",
            "code_39_reader",
          ], // Tipos de códigos a escanear
        },
      },
      function (err) {
        if (err) {
          console.error(err);
          showScannerFeedback(
            "Error al iniciar la cámara. Asegúrate de dar permisos.",
            "error"
          );
          return;
        }
        console.log("Initialization finished. Ready to start.");
        showScannerFeedback("Cámara lista, escanea un código.", "info");
        Quagga.start();
      }
    );

    // Evento cuando se detecta un código
    Quagga.onDetected(function (result) {
      const code = result.codeResult.code;
      console.log("Código detectado:", code);
      // Si ya estamos en detalles de producto y escaneamos otro, actualizamos directamente.
      // Si estamos en escáner, lo mostramos.
      findProductAndDisplay(code);
    });

    // Evento para mostrar errores o warnings durante el escaneo (opcional)
    Quagga.onProcessed(function (result) {
      const drawingCtx = Quagga.canvas.ctx.overlay;
      const drawingCanvas = Quagga.canvas.dom.overlay;

      if (result) {
        if (result.boxes) {
          drawingCtx.clearRect(
            0,
            0,
            parseInt(drawingCanvas.width),
            parseInt(drawingCanvas.height)
          );
          result.boxes
            .filter(function (box) {
              return box !== result.box;
            })
            .forEach(function (box) {
              Quagga.ImageDebug.drawPath(box, { x: 0, y: 1 }, drawingCtx, {
                color: "green",
                lineWidth: 2,
              });
            });
        }

        if (result.codeResult && result.codeResult.code) {
          Quagga.ImageDebug.drawPath(
            result.line,
            { x: "x", y: "y" },
            drawingCtx,
            { color: "red", lineWidth: 3 }
          );
        }
      }
    });
  }

  // --- Event Listeners ---
  backButton.addEventListener("click", () => {
    switchView("scanner-view");
    showScannerFeedback("Cámara lista, escanea un código.", "info");
  });

  // --- Inicio de la Aplicación ---
  loadProductData().then(() => {
    initializeScanner();
  });
});
