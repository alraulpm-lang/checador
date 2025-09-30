const scannerView = document.getElementById("scanner-view");
const productDetailsView = document.getElementById("product-details-view");
const backButton = document.getElementById("back-button");
const scannerFeedback = document.getElementById("scanner-feedback");
const productImage = document.getElementById("product-image");
const productName = document.getElementById("product-name");
const productPrice = document.getElementById("product-price");
const productDescription = document.getElementById("product-description");
const productSKU = document.getElementById("product-sku");

let productDatabase = [];
const GOOGLE_SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQUkZZSIVv2DdmP22Okp_GEjqGaKU6IikB9oiL4oZF2x9VYHqXMo48if_Du6VM67SE2MF-8YRfW-YP2/pub?gid=677583262&single=true&output=csv";

function switchView(viewId) {
    if (scannerView) scannerView.classList.remove("active");
    if (productDetailsView) productDetailsView.classList.remove("active");
    const viewToShow = document.getElementById(viewId);
    if (viewToShow) {
        viewToShow.classList.add("active");
    }
}

function showFeedback(message, type = "info") {
    if (scannerFeedback) {
        scannerFeedback.textContent = message;
        scannerFeedback.style.color = type === "error" ? "red" : "#333";
    }
}

function parseCSV(csvText) {
    const lines = csvText.split(/\r?\n/);
    if (lines.length < 2) return [];
    const headers = lines[0].split(",").map(h => h.trim());
    const data = [];
    for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === "") continue;
        const values = lines[i].split(",");
        if (values.length === headers.length) {
            const item = {};
            headers.forEach((header, index) => {
                item[header] = values[index].trim();
            });
            data.push(item);
        }
    }
    return data;
}

async function loadProducts() {
    showFeedback("Cargando productos...", "info");
    try {
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(GOOGLE_SHEET_CSV_URL)}`;
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error(`Error de red: ${response.status}`);
        const csvText = await response.text();
        productDatabase = parseCSV(csvText);
        if (productDatabase.length > 0) {
            showFeedback(`Productos cargados (${productDatabase.length}). Listo para escanear.`, "success");
        } else {
            showFeedback("Conexión exitosa, pero no se encontraron productos.", "error");
        }
    } catch (error) {
        console.error("FALLO LA CARGA DE PRODUCTOS:", error);
        showFeedback("Error al conectar con la base de datos.", "error");
    }
}

function displayProduct(barcode) {
    const product = productDatabase.find(p => p.CODIGO_BARRAS === barcode);
    if (product) {
        productImage.src = product.IMAGEN_URL || "";
        productName.textContent = product.NOMBRE;
        productPrice.textContent = `$${parseFloat(product.PRECIO || 0).toFixed(2)}`;
        productDescription.textContent = product.DESCRIPCION;
        productSKU.textContent = product.CODIGO_BARRAS;
        switchView("product-details-view");
    } else {
        showFeedback(`Producto ${barcode} no encontrado.`, "error");
    }
}

function startScanner() {
    if (typeof Quagga === "undefined") {
        showFeedback("Error: La librería del escáner no se pudo cargar.", "error");
        return;
    }
    Quagga.init({
        inputStream: {
            name: "Live",
            type: "LiveStream",
            target: document.querySelector('#interactive'),
            constraints: { facingMode: "environment" },
        },
        decoder: { readers: ["ean_reader"] },
    }, (err) => {
        if (err) {
            console.error("FALLO LA INICIALIZACIÓN DE LA CÁMARA:", err);
            showFeedback("No se pudo iniciar la cámara. Revisa los permisos del navegador.", "error");
            return;
        }
        Quagga.start();
    });
    Quagga.onDetected(result => displayProduct(result.codeResult.code));
}

if (backButton) {
    backButton.addEventListener("click", () => {
        switchView("scanner-view");
    });
}

startScanner();
loadProducts();