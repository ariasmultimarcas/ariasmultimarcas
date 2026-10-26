// Configuración de WhatsApp de la agencia
const WHATSAPP_NUMBER = "5492983586586";

// Tus URLs independientes de SheetDB
const API_URL = "https://sheetdb.io/api/v1/he6rgrgrrj7cw";       // Base de datos de Autos
const REVIEWS_API_URL = "https://sheetdb.io/api/v1/eo8vw8rxf2o8g"; // Base de datos de Reseñas

let vehicles = [];
let reviews = [];
let currentPhotoIndex = {};
let activeModalVehicleId = null;

// Paginación: cantidad inicial de vehículos a mostrar (3 filas de 3)
let currentlyShown = 9;

const grid = document.querySelector("#vehicleGrid");
const searchInput = document.querySelector("#searchInput");
const typeFilter = document.querySelector("#typeFilter");
const yearFilter = document.querySelector("#yearFilter");
const loadMoreBtn = document.querySelector("#loadMoreBtn");

const formatPrice = value => new Intl.NumberFormat("es-AR", {
  style: "currency", currency: "ARS", maximumFractionDigits: 0
}).format(value);

function whatsappLink(message) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

// ==========================================
// 1. CARGA Y GESTIÓN DE VEHÍCULOS
// ==========================================
async function fetchVehicles() {
  try {
    const response = await fetch(API_URL);
    const data = await response.json();
    
    vehicles = data.map(item => {
      let imgs = [];
      
      if (item.images && typeof item.images === 'string') {
        imgs = item.images.split(',').map(url => url.trim()).filter(url => url !== "");
      } else if (item.image && String(item.image).trim() !== "") {
        imgs = [String(item.image).trim()];
      }

      if (imgs.length === 0) {
        imgs = ["https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=900&q=80"];
      }

      currentPhotoIndex[item.id] = 0;

      return {
        ...item,
        id: Number(item.id),
        year: Number(item.year),
        km: Number(item.km),
        price: Number(item.price),
        images: imgs
      };
    });

    renderVehicles();
  } catch (error) {
    console.error("Error al cargar los vehículos:", error);
    if (grid) {
      grid.innerHTML = '<div class="no-results">Error al cargar los vehículos desde la planilla. <br>Intentá recargar la página en unos segundos.</div>';
    }
  }
}

window.nextPhoto = function(id, total) {
  currentPhotoIndex[id] = (currentPhotoIndex[id] + 1) % total;
  updateCarouselView(id);
};

window.prevPhoto = function(id, total) {
  currentPhotoIndex[id] = (currentPhotoIndex[id] - 1 + total) % total;
  updateCarouselView(id);
};

window.openModal = function(event, id) {
  if (event && event.target.classList.contains('carousel-btn')) {
    return;
  }

  const vehicle = vehicles.find(v => v.id === id);
  if (!vehicle) return;
  
  activeModalVehicleId = id;
  const currentIndex = currentPhotoIndex[id] || 0;
  const modal = document.querySelector("#imageModal");
  const modalImg = document.querySelector("#modalImg");
  
  if (modal && modalImg) {
    modalImg.src = vehicle.images[currentIndex];
    modal.classList.add("active");
  }
};

function modalNextPhoto() {
  if (activeModalVehicleId === null) return;
  const vehicle = vehicles.find(v => v.id === activeModalVehicleId);
  if (!vehicle) return;

  let currentIndex = currentPhotoIndex[activeModalVehicleId] || 0;
  currentIndex = (currentIndex + 1) % vehicle.images.length;
  currentPhotoIndex[activeModalVehicleId] = currentIndex;

  const modalImg = document.querySelector("#modalImg");
  if (modalImg) modalImg.src = vehicle.images[currentIndex];
  updateCarouselView(activeModalVehicleId);
}

function modalPrevPhoto() {
  if (activeModalVehicleId === null) return;
  const vehicle = vehicles.find(v => v.id === activeModalVehicleId);
  if (!vehicle) return;

  let currentIndex = currentPhotoIndex[activeModalVehicleId] || 0;
  currentIndex = (currentIndex - 1 + vehicle.images.length) % vehicle.images.length;
  currentPhotoIndex[activeModalVehicleId] = currentIndex;

  const modalImg = document.querySelector("#modalImg");
  if (modalImg) modalImg.src = vehicle.images[currentIndex];
  updateCarouselView(activeModalVehicleId);
}

function updateCarouselView(id) {
  const vehicle = vehicles.find(v => v.id === id);
  if (!vehicle) return;
  
  const currentIndex = currentPhotoIndex[id];
  const imgElement = document.querySelector(`#vehicle-img-${id}`);
  if (imgElement) {
    imgElement.src = vehicle.images[currentIndex];
  }

  const dotsContainer = document.querySelector(`#dots-${id}`);
  if (dotsContainer) {
    dotsContainer.innerHTML = vehicle.images.map((_, i) => `
      <span class="carousel-dot ${i === currentIndex ? 'active' : ''}"></span>
    `).join("");
  }
}

function renderVehicles() {
  if (!grid) return;

  const term = searchInput ? searchInput.value.trim().toLowerCase() : "";
  const type = typeFilter ? typeFilter.value : "todos";
  const yearRange = yearFilter ? yearFilter.value : "todos";

  const filtered = vehicles.filter(vehicle => {
    const matchesTerm = `${vehicle.brand} ${vehicle.model} ${vehicle.version}`.toLowerCase().includes(term);
    const matchesType = type === "todos" || vehicle.type === type;
    
    let matchesYear = true;
    if (yearRange !== "todos") {
      const [minYear, maxYear] = yearRange.split("-").map(Number);
      matchesYear = vehicle.year >= minYear && vehicle.year <= maxYear;
    }

    return matchesTerm && matchesType && matchesYear;
  });

  if (!filtered.length) {
    grid.innerHTML = '<div class="no-results">No encontramos vehículos con esos filtros. <br>Escribinos y te ayudamos a buscarlo.</div>';
    if (loadMoreBtn) loadMoreBtn.style.display = "none";
    return;
  }

  const vehiclesToDisplay = filtered.slice(0, currentlyShown);

  grid.innerHTML = vehiclesToDisplay.map(vehicle => {
    const activeIndex = currentPhotoIndex[vehicle.id] || 0;
    const hasMultiple = vehicle.images.length > 1;

    return `
      <article class="vehicle-card">
        <div class="vehicle-image">
          <img id="vehicle-img-${vehicle.id}" src="${vehicle.images[activeIndex]}" alt="${vehicle.brand} ${vehicle.model} ${vehicle.year}" loading="lazy" onclick="openModal(event, ${vehicle.id})" title="Hacé clic para ampliar">
          <span class="vehicle-tag">${vehicle.tag}</span>
          
          ${hasMultiple ? `
            <button class="carousel-btn carousel-prev" onclick="prevPhoto(${vehicle.id},${vehicle.images.length})" aria-label="Foto anterior">&#10094;</button>
            <button class="carousel-btn carousel-next" onclick="nextPhoto(${vehicle.id},${vehicle.images.length})" aria-label="Foto siguiente">&#10095;</button>
            <div class="carousel-dots" id="dots-${vehicle.id}">
              ${vehicle.images.map((_, i) => `<span class="carousel-dot ${i === activeIndex ? 'active' : ''}"></span>`).join("")}
            </div>
          ` : ''}
        </div>
        <div class="vehicle-body">
          <div class="vehicle-year">${vehicle.year} · ${vehicle.brand.toUpperCase()}</div>
          <h3 class="vehicle-title">${vehicle.model}</h3>
          <div class="vehicle-specs">
            <span>◷ ${vehicle.km.toLocaleString("es-AR")} km</span>
            <span>▱ ${vehicle.type}</span>
            <span>⚙ ${vehicle.version}</span>
          </div>
          <div class="vehicle-bottom">
            <div class="vehicle-price">${formatPrice(vehicle.price)}<small>Precio contado / permuta</small></div>
            <a class="vehicle-ask" href="${whatsappLink(`Hola, quiero consultar por el ${vehicle.brand} ${vehicle.model}${vehicle.year}. ¿Me pasan más información?`)}" target="_blank" rel="noopener" aria-label="Consultar por ${vehicle.brand} ${vehicle.model}">↗</a>
          </div>
        </div>
      </article>
    `;
  }).join("");

  if (loadMoreBtn) {
    if (currentlyShown >= filtered.length) {
      loadMoreBtn.style.display = "none";
    } else {
      loadMoreBtn.style.display = "block";
    }
  }
}

// ==========================================
// 2. CARGA Y GESTIÓN DE RESEÑAS DINÁMICAS
// ==========================================
async function fetchReviews() {
  const reviewsGrid = document.getElementById("reviewsGrid");
  if (!reviewsGrid) return;

  try {
    const response = await fetch(REVIEWS_API_URL);
    const data = await response.json();

    if (Array.isArray(data) && data.length > 0) {
      reviews = data;
      renderReviews();
    } else {
      reviewsGrid.innerHTML = '<div class="no-results">Sé el primero en dejar una opinión sobre Arias Multimarcas.</div>';
    }
  } catch (error) {
    console.error("Error al cargar reseñas:", error);
    reviewsGrid.innerHTML = '<div class="no-results">No se pudieron cargar las opiniones en este momento.</div>';
  }
}

function renderReviews() {
  const reviewsGrid = document.getElementById("reviewsGrid");
  if (!reviewsGrid) return;

  reviewsGrid.innerHTML = reviews.map(rev => {
    const score = Number(rev.estrellas) || 5;
    const starsHtml = "★".repeat(score) + "☆".repeat(5 - score);
    const initials = rev.nombre ? rev.nombre.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "AM";

    return `
      <div class="review-card">
        <div class="review-stars" style="color: #f1c40f; font-size: 1.1rem; letter-spacing: 1.5px; margin-bottom: 15px;">${starsHtml}</div>
        <p class="review-text">"${rev.comentario}"</p>
        <div class="review-user">
          <div class="user-avatar">${initials}</div>
          <div class="user-info">
            <h4>${rev.nombre}</h4>
            <span>${rev.vehiculo || 'Cliente'} · ${rev.fecha || 'Reciente'}</span>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

// ==========================================
// 3. EVENTOS GLOBALES Y DOMContentLoaded
// ==========================================
if (searchInput) searchInput.addEventListener("input", () => { currentlyShown = 9; renderVehicles(); });
if (typeFilter) typeFilter.addEventListener("change", () => { currentlyShown = 9; renderVehicles(); });
if (yearFilter) yearFilter.addEventListener("change", () => { currentlyShown = 9; renderVehicles(); });

const mainWhatsApp = document.querySelector("#mainWhatsApp");
const floatingWhatsApp = document.querySelector("#floatingWhatsApp");
const generalMessage = "Hola, quiero consultar por los vehículos de ARIAS MULTIMARCAS.";

if (mainWhatsApp) mainWhatsApp.href = whatsappLink(generalMessage);
if (floatingWhatsApp) floatingWhatsApp.href = whatsappLink(generalMessage);

const yearNow = document.querySelector("#yearNow");
if (yearNow) yearNow.textContent = new Date().getFullYear();

// Menú móvil hamburguesa
const menuToggle = document.querySelector("#menuToggle");
const mainNav = document.querySelector("#mainNav");

if (menuToggle && mainNav) {
  menuToggle.addEventListener("click", () => {
    mainNav.classList.toggle("open");
  });
  document.querySelectorAll("#mainNav a").forEach(link => {
    link.addEventListener("click", () => mainNav.classList.remove("open"));
  });
}

// Inicializar cargas de datos de ambas bases de datos
fetchVehicles();
fetchReviews();

document.addEventListener("DOMContentLoaded", function () {

  // --- Botón Cargar Más ---
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener("click", () => {
      currentlyShown += 9;
      renderVehicles();
    });
  }

  // --- Selector Interactivo de Estrellas (Forzado con !important) ---
  const starPicker = document.getElementById("starPicker");
  const reviewRatingInput = document.getElementById("reviewRating");

  if (starPicker && reviewRatingInput) {
    const stars = starPicker.querySelectorAll("span");

    function setRatingDirect(count) {
      stars.forEach((star, index) => {
        if (index < count) {
          star.style.setProperty("color", "#f1c40f", "important"); // Dorado intenso
          star.style.setProperty("transform", "scale(1.15)", "important");
          star.style.setProperty("cursor", "pointer", "important");
        } else {
          star.style.setProperty("color", "#444444", "important"); // Gris apagado
          star.style.setProperty("transform", "scale(1)", "important");
          star.style.setProperty("cursor", "pointer", "important");
        }
      });
    }

    // Iniciar con 5 estrellas seleccionadas por defecto
    setRatingDirect(5);

    stars.forEach((star, index) => {
      // Al pasar el cursor por encima
      star.addEventListener("mouseenter", () => {
        setRatingDirect(index + 1);
      });

      // Al hacer clic
      star.addEventListener("click", () => {
        const rating = index + 1;
        reviewRatingInput.value = rating;
        setRatingDirect(rating);
      });
    });

    // Al retirar el cursor del área del selector de estrellas
    starPicker.addEventListener("mouseleave", () => {
      const savedRating = parseInt(reviewRatingInput.value) || 5;
      setRatingDirect(savedRating);
    });
  }

  // --- Envío del Formulario de Reseñas a Google Sheets ---
  const reviewForm = document.getElementById("reviewForm");
  if (reviewForm) {
    reviewForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      const btn = document.getElementById("submitReviewBtn");
      if (btn) {
        btn.disabled = true;
        btn.innerText = "Publicando...";
      }

      const today = new Date();
      const fechaStr = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;

      const newReview = {
        id: Date.now().toString(),
        nombre: document.getElementById("reviewName").value.trim(),
        vehiculo: document.getElementById("reviewVehicle").value.trim() || "Cliente",
        estrellas: document.getElementById("reviewRating").value,
        comentario: document.getElementById("reviewComment").value.trim(),
        fecha: fechaStr
      };

      try {
        const res = await fetch(REVIEWS_API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: [newReview] })
        });

        if (res.ok) {
          alert("¡Gracias por tu opinión! Se ha publicado correctamente.");
          reviewForm.reset();
          if (reviewRatingInput) reviewRatingInput.value = "5";
          setRatingDirect(5);
          fetchReviews();
        } else {
          alert("Ocurrió un error al guardar la opinión. Intentá de nuevo.");
        }
      } catch (err) {
        console.error("Error al publicar la reseña:", err);
        alert("No se pudo conectar con el servidor de reseñas.");
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerText = "Publicar mi opinión 🌟";
        }
      }
    });
  }

  // --- Modal de imágenes ---
  const modal = document.querySelector("#imageModal");
  const modalClose = document.querySelector("#modalClose");
  const modalNext = document.querySelector("#modalNext");
  const modalPrev = document.querySelector("#modalPrev");

  if (modalClose) {
    modalClose.addEventListener("click", () => {
      if (modal) modal.classList.remove("active");
      activeModalVehicleId = null;
    });
  }

  if (modalNext) modalNext.addEventListener("click", (e) => { e.stopPropagation(); modalNextPhoto(); });
  if (modalPrev) modalPrev.addEventListener("click", (e) => { e.stopPropagation(); modalPrevPhoto(); });

  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.classList.remove("active");
        activeModalVehicleId = null;
      }
    });
  }

  document.addEventListener("keydown", (e) => {
    if (modal && modal.classList.contains("active")) {
      if (e.key === "ArrowRight") modalNextPhoto();
      if (e.key === "ArrowLeft") modalPrevPhoto();
      if (e.key === "Escape") {
        modal.classList.remove("active");
        activeModalVehicleId = null;
      }
    }
  });

  // --- Formulario 1: Vender / Permutar ---
  const formTradeIn = document.getElementById("tradeInForm");
  if (formTradeIn) {
    formTradeIn.addEventListener("submit", function (e) {
      e.preventDefault();
      const marca = document.getElementById("carBrand").value.trim();
      const modelo = document.getElementById("carModel").value.trim();
      const anio = document.getElementById("carYear").value.trim();
      const kms = document.getElementById("carKms").value.trim();
      const nombre = document.getElementById("clientName").value.trim();
      const telefono = document.getElementById("clientPhone").value.trim();
      const comentarios = document.getElementById("carComments").value.trim();

      let mensaje = `Hola! Me interesa cotizar un vehículo para venta o permuta:\n\n` +
                    `🚗 *Marca:* ${marca}\n` +
                    `🚙 *Modelo:* ${modelo}\n` +
                    `📅 *Año:* ${anio}\n` +
                    `🛣️ *Kms:* ${kms}\n\n` +
                    `👤 *Nombre:* ${nombre}\n` +
                    `📞 *Teléfono:* ${telefono}\n`;

      if (comentarios) mensaje += `📝 *Comentarios:* ${comentarios}`;

      window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(mensaje)}`, "_blank");
    });
  }

  // --- Formulario 2: Búsqueda de Vehículo ---
  const formSearch = document.getElementById("searchCarForm");
  if (formSearch) {
    formSearch.addEventListener("submit", function (e) {
      e.preventDefault();
      const marca = document.getElementById("searchBrand").value;
      const condicion = document.getElementById("searchCondition").value;
      const modelo = document.getElementById("searchModel").value.trim() || "A definir";
      const nombre = document.getElementById("searchClientName").value.trim();
      const telefono = document.getElementById("searchClientPhone").value.trim();
      const comentarios = document.getElementById("searchComments").value.trim();

      let mensaje = `Hola! Estoy buscando un vehículo y quisiera consultar disponibilidad:\n\n` +
                    `🔍 *Marca deseada:* ${marca}\n` +
                    `✨ *Condición:* ${condicion}\n` +
                    `🚘 *Modelo/Estilo:* ${modelo}\n\n` +
                    `👤 *Nombre:* ${nombre}\n` +
                    `📞 *Teléfono:* ${telefono}\n`;

      if (comentarios) mensaje += `📝 *Comentarios:* ${comentarios}`;

      window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(mensaje)}`, "_blank");
    });
  }
});