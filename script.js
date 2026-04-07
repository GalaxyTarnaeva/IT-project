const THEME_KEY = "mahonya-theme";
const LIGHT_ASSET_DIR = "img";
const DARK_ASSET_DIR = "dimg";
const DARK_THEME_ASSETS = new Set([
  "граф_элементы.png",
  "иконка_вк.png",
  "иконка_почта.png",
  "иконка_тг.png",
  "иконка_тел.png",
  "мое_фото.png",
  "программы.png",
  "телефон.png",
  "хэдер.png"
]);
const body = document.body;
const toggle = document.getElementById("themeToggle");
const projectViewport = document.getElementById("projectsViewport");
const projectTrack = projectViewport ? projectViewport.querySelector(".projects__track") : null;
const projectsPrevButton = document.getElementById("projectsPrev");
const projectsNextButton = document.getElementById("projectsNext");
const projectCards = projectViewport
  ? Array.from(projectViewport.querySelectorAll(".project-card"))
  : [];
let isPointerDown = false;
let didDragProjects = false;
let dragStartX = 0;
let dragStartScrollLeft = 0;
let activeProjectIndex = 0;
let wheelLockUntil = 0;

function canScrollProjects() {
  if (!projectViewport) {
    return false;
  }

  return projectViewport.scrollWidth > projectViewport.clientWidth + 8;
}

function getThemeAssetDirectory(theme) {
  return theme === "dark" ? DARK_ASSET_DIR : LIGHT_ASSET_DIR;
}

function getAssetPath(assetName, theme) {
  if (theme === "dark" && DARK_THEME_ASSETS.has(assetName)) {
    return `${DARK_ASSET_DIR}/${assetName}`;
  }

  return `${LIGHT_ASSET_DIR}/${assetName}`;
}

function applyThemeAssets(theme) {
  document.querySelectorAll("[data-asset]").forEach((element) => {
    const assetName = element.dataset.asset;

    if (element.tagName === "IMG") {
      element.src = getAssetPath(assetName, theme);
    }
  });

  document.querySelectorAll("[data-bg-asset]").forEach((element) => {
    const assetName = element.dataset.bgAsset;
    element.style.backgroundImage = `url("${getAssetPath(assetName, theme)}")`;
  });
}

function applyTheme(theme) {
  body.classList.toggle("dark", theme === "dark");
  applyThemeAssets(theme);
}

function getInitialTheme() {
  const storedTheme = localStorage.getItem(THEME_KEY);

  if (storedTheme === "dark" || storedTheme === "light") {
    return storedTheme;
  }

  return "light";
}

function initThemeToggle() {
  const initialTheme = getInitialTheme();
  applyTheme(initialTheme);

  if (!toggle) {
    return;
  }

  toggle.addEventListener("click", () => {
    const nextTheme = body.classList.contains("dark") ? "light" : "dark";
    localStorage.setItem(THEME_KEY, nextTheme);
    applyTheme(nextTheme);
  });
}

function initProjectsWheelSlider() {
  if (!projectViewport || !projectTrack) {
    return;
  }

  const getProjectOffsets = () => projectCards.map((card) => card.offsetLeft);

  const getClosestProjectIndex = () => {
    const offsets = getProjectOffsets();

    if (offsets.length === 0) {
      return 0;
    }

    const currentScroll = projectViewport.scrollLeft;
    let closestIndex = 0;
    let closestDistance = Number.POSITIVE_INFINITY;

    offsets.forEach((offset, index) => {
      const distance = Math.abs(offset - currentScroll);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });

    return closestIndex;
  };

  const updateProjectsNavState = () => {
    activeProjectIndex = getClosestProjectIndex();
    const sliderIsScrollable = canScrollProjects();

    if (projectsPrevButton) {
      projectsPrevButton.disabled = !sliderIsScrollable || activeProjectIndex <= 0;
    }

    if (projectsNextButton) {
      projectsNextButton.disabled = !sliderIsScrollable || activeProjectIndex >= projectCards.length - 1;
    }
  };

  const scrollToProject = (index) => {
    const offsets = getProjectOffsets();
    const safeIndex = Math.max(0, Math.min(index, offsets.length - 1));
    const targetOffset = offsets[safeIndex];

    if (typeof targetOffset !== "number") {
      return;
    }

    activeProjectIndex = safeIndex;
    projectViewport.scrollTo({
      left: targetOffset,
      behavior: "smooth"
    });
    updateProjectsNavState();
  };

  const scrollByProjectStep = (direction) => {
    if (!canScrollProjects()) {
      return;
    }

    updateProjectsNavState();
    scrollToProject(activeProjectIndex + direction);
  };

  const releaseProjectsDrag = () => {
    isPointerDown = false;
    projectViewport.classList.remove("is-dragging");
  };

  projectViewport.addEventListener("mouseleave", () => {
    releaseProjectsDrag();
  });

  projectViewport.addEventListener("pointerup", () => {
    if (isPointerDown && canScrollProjects()) {
      updateProjectsNavState();
      scrollToProject(activeProjectIndex);
    }

    releaseProjectsDrag();
  });

  projectViewport.addEventListener("pointercancel", () => {
    releaseProjectsDrag();
  });

  projectViewport.addEventListener("pointermove", (event) => {
    if (!isPointerDown) {
      return;
    }

    const deltaX = event.clientX - dragStartX;
    if (Math.abs(deltaX) > 8) {
      didDragProjects = true;
    }
    projectViewport.scrollLeft = dragStartScrollLeft - deltaX;
  });

  projectTrack.addEventListener("click", (event) => {
    if (!didDragProjects) {
      return;
    }

    event.preventDefault();
    didDragProjects = false;
  }, true);

  const onWheelScroll = (event) => {
    if (!canScrollProjects()) {
      return;
    }

    const scrollDelta = Math.abs(event.deltaY) > Math.abs(event.deltaX)
      ? event.deltaY
      : event.deltaX;

    if (scrollDelta === 0) {
      return;
    }

    event.preventDefault();
    const now = Date.now();

    if (now < wheelLockUntil) {
      return;
    }

    wheelLockUntil = now + 280;
    scrollByProjectStep(scrollDelta > 0 ? 1 : -1);
  };

  projectViewport.addEventListener("wheel", onWheelScroll, { passive: false });

  projectTrack.addEventListener("pointerdown", (event) => {
    if (!canScrollProjects() || !event.target.closest(".project-card")) {
      return;
    }

    isPointerDown = true;
    didDragProjects = false;
    dragStartX = event.clientX;
    dragStartScrollLeft = projectViewport.scrollLeft;
    projectViewport.classList.add("is-dragging");
  });

  projectViewport.addEventListener("scroll", () => {
    updateProjectsNavState();
  });

  projectViewport.addEventListener("keydown", (event) => {
    if (!canScrollProjects()) {
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      scrollByProjectStep(1);
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      scrollByProjectStep(-1);
    }
  });

  if (projectsPrevButton) {
    projectsPrevButton.addEventListener("click", () => {
      scrollByProjectStep(-1);
    });
  }

  if (projectsNextButton) {
    projectsNextButton.addEventListener("click", () => {
      scrollByProjectStep(1);
    });
  }

  window.addEventListener("resize", () => {
    updateProjectsNavState();
    scrollToProject(activeProjectIndex);
  });

  updateProjectsNavState();
}

initThemeToggle();
initProjectsWheelSlider();
