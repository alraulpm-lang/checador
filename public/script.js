document.addEventListener("DOMContentLoaded", () => {
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

  // --- Base de datos ---
  let productDatabase = [];

  // --- URL de Google Sheet ---
  const GOOGLE_SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQUkZZSIVv2DdmP22Okp_GEjqGaKU6IikB9oiL4oZF2x9VYHqXMo48if_Du6VM67SE2MF-8YRfW-YP2/pub?gid=677583262&single=true&output=csv";

  // --- Funciones ---

  function switchView(viewId) {
    scannerView.classList.remove("active");
    productDetailsView.classList.remove("active");
    document.getElementById(viewId).classList.add("active");
  }

  function showScannerFeedback(message, type = "info") {
    scannerFeedback.textContent = message;
    scannerFeedback.className = `feedback ${type}`;
  }

  function parseCSV(csv) {
    const lines = csv.split(/\r?\n/);
    if (lines.length < 2) return [];

    const headers = lines[0].split(",").map(header => header.trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === "") continue;
      const currentline = lines[i].split(",");
      if (currentline.length === headers.length) {
        const item = {};
        for (let j = 0; j < headers.length; j++) {
          item[headers[j]] = currentline[j].trim();
        }
        data.push(item);
      }
    }
    return data;
  }

  async function loadProductData() {
    showScannerFeedback("Cargando productos...", "info");
    try {
      // Usamos un proxy para evitar problemas de CORS, que es una causa común de fallo.
      const response = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(GOOGLE_SHEET_CSV_URL)}`);
      
      if (!response.ok) {
        throw new Error(`Error de red: ${response.statusText}`);
      }

      const csvText = await response.text();
      console.log("CSV recibido:", csvText); // Log para depurar
      
      productDatabase = parseCSV(csvText);
      
      if (productDatabase.length > 0) {
        showScannerFeedback(`Productos cargados (${productDatabase.length}). Listo para escanear.`, "success");
      } else {
        showScannerScannerFeedback("Conectado, pero no se encontraron productos en el archivo.", "error");
      }
      console.log("Base de datos de productos cargada:", productDatabase);

    } catch (error) {
      console.error("Error al cargar la base de datos de productos:", error);
      showScannerFeedback("Error al cargar productos. Revisa la consola para más detalles.", "error");
    }
  }

  function findProductAndDisplay(barcode) {
    if (productDatabase.length === 0) {
      showScannerFeedback("La base de datos de productos no está cargada.", "error");
      return;
    }

    const product = productDatabase.find(p => p.CODIGO_BARRAS === barcode);

    if (product) {
      productImage.src = product.IMAGEN_URL || "https://via.placeholder.com/200x200?text=Sin+Imagen";
      productName.textContent = product.NOMBRE;
      productPrice.textContent = `$${parseFloat(product.PRECIO || 0).toFixed(2)}`;
      productDescription.textContent = product.DESCRIPCION || "Sin descripción disponible.";
      productSKU.textContent = product.CODIGO_BARRAS;
      switchView("product-details-view");
    } else {
      showScannerFeedback(`Producto con código ${barcode} no encontrado.`, "error");
    }
  }

  function initializeScanner() {
    Quagga.init({
      inputStream: {
        name: "Live",
        type: "LiveStream",
        target: document.querySelector('#interactive'),
        constraints: {
          width: 640,
          height: 480,
          facingMode: "environment"
        },
      },
      decoder: {
        readers: ["ean_reader", "upc_reader", "code_128_reader", "code_39_reader"]
      },
    }, (err) => {
      if (err) {
        console.error("Error de Quagga:", err);
        showScannerFeedback("Error al iniciar la cámara. Asegúrate de dar permisos en tu navegador.", "error");
        return;
      }
      console.log("Quagga inicializado. Listo para empezar.");
      Quagga.start();
    });

    Quagga.onDetected((result) => {
      const code = result.codeResult.code;
      console.log("Código detectado:", code);
      findProductAndDisplay(code);
    });
  }

  // --- Event Listeners ---
  backButton.addEventListener("click", () => {
    switchView("scanner-view");
  });

  // --- Inicio de la Aplicación ---
  
  // Inicia la cámara y la carga de datos al mismo tiempo.
  initializeScanner();
  loadProductData();
});