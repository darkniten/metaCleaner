/**
 * Photo Metadata Studio — 100% Client-Side Engine
 * Побудовано за палітрою кольорів та дизайн-системою «Photo Metadata Studio».
 * Повна мобільна оптимізація та підтримка тач-інтерфейсів.
 */

"use strict";

const ExifUtils = {
  degToExifRational(degFloat) {
    const absDeg = Math.abs(degFloat);
    const d = Math.floor(absDeg);
    const mFloat = (absDeg - d) * 60;
    const m = Math.floor(mFloat);
    const s = Math.round((mFloat - m) * 60 * 100);
    return [
      [d, 1],
      [m, 1],
      [s, 100],
    ];
  },

  exifRationalToDeg(rationals, ref) {
    if (!rationals || rationals.length < 3) return null;
    const d = rationals[0][0] / rationals[0][1];
    const m = rationals[1][0] / rationals[1][1];
    const s = rationals[2][0] / rationals[2][1];
    let deg = d + m / 60 + s / 3600;
    if (ref === "S" || ref === "W") deg = -deg;
    return Number(deg.toFixed(6));
  },

  exifDateToInput(exifDateStr) {
    if (!exifDateStr || typeof exifDateStr !== "string") return "";
    const parts = exifDateStr.trim().split(" ");
    if (parts.length !== 2) return "";
    const datePart = parts[0].replace(/:/g, "-");
    const timePart = parts[1].substring(0, 5);
    return `${datePart}T${timePart}`;
  },

  inputToExifDate(inputVal) {
    if (!inputVal) return "";
    const [datePart, timePart] = inputVal.split("T");
    const formattedDate = datePart.replace(/-/g, ":");
    const seconds = timePart.length === 5 ? ":00" : "";
    return `${formattedDate} ${timePart}${seconds}`;
  },

  formatBytes(bytes, decimals = 1) {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (
      parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + " " + sizes[i]
    );
  },
};

class PhotoMetadataStudio {
  constructor() {
    this.files = [];
    this.currentFileIndex = -1;
    this.piexifAvailable = typeof window.piexif !== "undefined";
    this.jszipAvailable = typeof window.JSZip !== "undefined";

    this.cacheElements();
    this.bindEvents();
    this.initMobileDrawer();
  }

  cacheElements() {
    // Навігація та мобільний Drawer
    this.studioSidebar = document.getElementById("studioSidebar");
    this.sidebarBackdrop = document.getElementById("sidebarBackdrop");
    this.btnOpenMobileSidebar = document.getElementById("btnOpenMobileSidebar");
    this.btnCloseMobileSidebar = document.getElementById(
      "btnCloseMobileSidebar",
    );
    this.navItems = document.querySelectorAll(".nav-item");
    this.viewPanels = document.querySelectorAll(".view-panel");

    // Шапка
    this.globalSearchInput = document.getElementById("globalSearchInput");
    this.filesCountBadge = document.getElementById("filesCountBadge");
    this.btnTopDownloadZip = document.getElementById("btnTopDownloadZip");

    // Головна (Дропзона та Таблиця)
    this.dropZone = document.getElementById("dropZone");
    this.fileInput = document.getElementById("fileInput");
    this.btnBrowse = document.getElementById("btnBrowse");
    this.btnClearList = document.getElementById("btnClearList");
    this.filesTableBody = document.getElementById("filesTableBody");

    // Редактор
    this.editorPreviewImg = document.getElementById("editorPreviewImg");
    this.editorEmptyPreview = document.getElementById("editorEmptyPreview");
    this.editorFileName = document.getElementById("editorFileName");
    this.editorFileWeight = document.getElementById("editorFileWeight");
    this.editArtist = document.getElementById("editArtist");
    this.editCopyright = document.getElementById("editCopyright");
    this.editImageDescription = document.getElementById("editImageDescription");
    this.editDateTime = document.getElementById("editDateTime");
    this.btnSetNowDate = document.getElementById("btnSetNowDate");
    this.btnClearDate = document.getElementById("btnClearDate");
    this.editMake = document.getElementById("editMake");
    this.editModel = document.getElementById("editModel");
    this.editGpsLat = document.getElementById("editGpsLat");
    this.editGpsLon = document.getElementById("editGpsLon");
    this.btnGpsOnlyClear = document.getElementById("btnGpsOnlyClear");
    this.btnResetCurrentEdits = document.getElementById("btnResetCurrentEdits");
    this.btnSaveCurrentEdits = document.getElementById("btnSaveCurrentEdits");

    // Метадані
    this.viewGpsBox = document.getElementById("viewGpsBox");
    this.viewGpsCoords = document.getElementById("viewGpsCoords");
    this.viewGpsLink = document.getElementById("viewGpsLink");
    this.metaTbodyDate = document.getElementById("metaTbodyDate");
    this.metaTbodyCamera = document.getElementById("metaTbodyCamera");
    this.metaTbodyAuthor = document.getElementById("metaTbodyAuthor");
    this.metaTbodyTech = document.getElementById("metaTbodyTech");

    // Очищення
    this.btnCanvasClean = document.getElementById("btnCanvasClean");

    // Експорт
    this.selectExportFormat = document.getElementById("selectExportFormat");
    this.qualityControlGroup = document.getElementById("qualityControlGroup");
    this.rangeJpegQuality = document.getElementById("rangeJpegQuality");
    this.labelQualityPercent = document.getElementById("labelQualityPercent");
    this.exportFileName = document.getElementById("exportFileName");
    this.exportExtensionBadge = document.getElementById("exportExtensionBadge");
    this.btnVerifyExport = document.getElementById("btnVerifyExport");
    this.btnDownloadSingle = document.getElementById("btnDownloadSingle");
    this.diffOriginalList = document.getElementById("diffOriginalList");
    this.diffModifiedList = document.getElementById("diffModifiedList");
    this.exportAuditNotice = document.getElementById("exportAuditNotice");
    this.exportAuditDetails = document.getElementById("exportAuditDetails");

    // Пакетна обробка
    this.btnBatchZipDownload = document.getElementById("btnBatchZipDownload");
    this.batchProgressPercent = document.getElementById("batchProgressPercent");
    this.batchProgressBar = document.getElementById("batchProgressBar");

    // Допомога
    this.btnHelp = document.getElementById("btnHelp");
    this.helpModal = document.getElementById("helpModal");
    this.btnCloseModal = document.getElementById("btnCloseModal");
    this.btnModalCloseAction = document.getElementById("btnModalCloseAction");
    this.toastContainer = document.getElementById("toastContainer");
  }

  initMobileDrawer() {
    const openMenu = () => {
      this.studioSidebar.classList.add("drawer-open");
      this.sidebarBackdrop.classList.add("active");
      document.body.style.overflow = "hidden"; // Блокування скролу сторінки під меню
    };

    const closeMenu = () => {
      this.studioSidebar.classList.remove("drawer-open");
      this.sidebarBackdrop.classList.remove("active");
      document.body.style.overflow = "";
    };

    this.btnOpenMobileSidebar.addEventListener("click", openMenu);
    this.btnCloseMobileSidebar.addEventListener("click", closeMenu);
    this.sidebarBackdrop.addEventListener("click", closeMenu);

    // Автозакриття меню на мобільних при кліку на будь-яку вкладку
    this.navItems.forEach((item) => {
      item.addEventListener("click", () => {
        if (window.innerWidth <= 820) {
          closeMenu();
        }
      });
    });
  }

  bindEvents() {
    // Перемикання вкладок
    this.navItems.forEach((item) => {
      item.addEventListener("click", () => {
        const targetView = item.getAttribute("data-view");
        this.switchView(targetView);
      });
    });

    // Дропзона
    this.btnBrowse.addEventListener("click", (e) => {
      e.stopPropagation();
      this.fileInput.click();
    });
    this.dropZone.addEventListener("click", () => this.fileInput.click());

    this.dropZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      this.dropZone.classList.add("dragover");
    });
    this.dropZone.addEventListener("dragleave", () =>
      this.dropZone.classList.remove("dragover"),
    );
    this.dropZone.addEventListener("drop", (e) => {
      e.preventDefault();
      this.dropZone.classList.remove("dragover");
      if (e.dataTransfer.files?.length > 0) {
        this.handleIncomingFiles(e.dataTransfer.files);
      }
    });

    this.fileInput.addEventListener("change", (e) => {
      if (e.target.files?.length > 0) {
        this.handleIncomingFiles(e.target.files);
        this.fileInput.value = "";
      }
    });

    this.btnClearList.addEventListener("click", () => this.clearAll());

    // Live-sync полів форми
    const formFields = [
      this.editArtist,
      this.editCopyright,
      this.editImageDescription,
      this.editDateTime,
      this.editMake,
      this.editModel,
      this.editGpsLat,
      this.editGpsLon,
    ];
    formFields.forEach((field) => {
      field.addEventListener("input", () => this.syncStagedEdits());
    });

    this.btnSetNowDate.addEventListener("click", () => {
      const now = new Date();
      this.editDateTime.value = new Date(
        now.getTime() - now.getTimezoneOffset() * 60000,
      )
        .toISOString()
        .slice(0, 16);
      this.syncStagedEdits();
    });

    this.btnClearDate.addEventListener("click", () => {
      this.editDateTime.value = "";
      this.syncStagedEdits();
    });

    this.btnGpsOnlyClear.addEventListener("click", () => {
      this.editGpsLat.value = "";
      this.editGpsLon.value = "";
      this.syncStagedEdits();
      this.showToast("Координати GPS очищено", "info");
    });

    this.btnResetCurrentEdits.addEventListener("click", () => {
      const file = this.files[this.currentFileIndex];
      if (!file) return;
      file.stagedEdits = JSON.parse(JSON.stringify(file.initialStaged));
      file.isWipedAll = false;
      file.isModified = false;
      this.populateEditForm();
      this.renderMetadataViewer();
      this.renderFilesTable();
      this.renderBatchProgress();
      this.showToast("Значення скинуто", "info");
    });

    this.btnSaveCurrentEdits.addEventListener("click", () => {
      this.syncStagedEdits();
      this.showToast("Зміни збережено для експорту", "success");
      this.renderFilesTable();
      this.renderMetadataViewer();
      this.renderBatchProgress();
    });

    // Очищення Canvas
    this.btnCanvasClean.addEventListener("click", () => {
      this.executeCleaningPreset("all");
      this.showToast("Очищено через Canvas", "success");
    });

    // Експорт
    this.selectExportFormat.addEventListener("change", () => {
      this.updateExportFormatUI();
      this.renderDiff();
    });

    this.rangeJpegQuality.addEventListener("input", (e) => {
      this.labelQualityPercent.textContent = `${e.target.value}%`;
    });

    this.btnDownloadSingle.addEventListener("click", () =>
      this.downloadActiveFile(),
    );
    this.btnVerifyExport.addEventListener("click", () =>
      this.verifyActiveFileIntegrity(),
    );

    this.btnTopDownloadZip.addEventListener("click", () =>
      this.exportAllAsZip(),
    );
    this.btnBatchZipDownload.addEventListener("click", () =>
      this.exportAllAsZip(),
    );

    // Допомога / Модальне вікно
    this.btnHelp.addEventListener("click", () =>
      this.helpModal.classList.remove("hidden"),
    );
    this.btnCloseModal.addEventListener("click", () =>
      this.helpModal.classList.add("hidden"),
    );
    this.btnModalCloseAction.addEventListener("click", () =>
      this.helpModal.classList.add("hidden"),
    );
    this.helpModal.addEventListener("click", (e) => {
      if (e.target === this.helpModal) this.helpModal.classList.add("hidden");
    });

    // Пошук
    this.globalSearchInput.addEventListener("input", (e) => {
      const term = e.target.value.toLowerCase().trim();
      const rows = this.filesTableBody.querySelectorAll("tr[data-index]");
      rows.forEach((r) => {
        const name =
          r.querySelector(".filename-text")?.textContent.toLowerCase() || "";
        r.style.display = name.includes(term) ? "" : "none";
      });
    });
  }

  showToast(message, type = "info") {
    const toast = document.createElement("div");
    toast.className = `studio-toast toast-${type}`;

    let dotClass = "dot-info";
    if (type === "success") dotClass = "dot-success";
    if (type === "error") dotClass = "dot-error";
    if (type === "warning") dotClass = "dot-warning";

    toast.innerHTML = `<span class="status-dot ${dotClass}"></span><span>${message}</span>`;
    this.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transition = "opacity 0.2s";
      setTimeout(() => toast.remove(), 200);
    }, 3200);
  }

  switchView(viewId) {
    this.navItems.forEach((item) => {
      item.classList.toggle(
        "active",
        item.getAttribute("data-view") === viewId,
      );
    });
    this.viewPanels.forEach((panel) => {
      panel.classList.toggle("active", panel.id === viewId);
    });

    if (viewId === "viewExport") {
      this.renderDiff();
    }
  }

  async handleIncomingFiles(fileList) {
    const previousCount = this.files.length;
    for (const rawFile of Array.from(fileList)) {
      if (
        !/\.(jpe?g|png|webp)$/i.test(rawFile.name) &&
        !["image/jpeg", "image/png", "image/webp"].includes(rawFile.type)
      ) {
        this.showToast(`Пропущено: ${rawFile.name}`, "warning");
        continue;
      }
      try {
        const record = await this.createFileRecord(rawFile);
        this.files.push(record);
      } catch (err) {
        this.showToast(`Помилка: ${rawFile.name}`, "error");
      }
    }

    if (this.files.length > 0) {
      this.filesCountBadge.textContent = `${this.files.length} файлів`;
      this.btnTopDownloadZip.disabled = false;
      this.btnBatchZipDownload.disabled = false;
      this.renderFilesTable();
      if (this.currentFileIndex === -1) {
        this.selectFile(0);
      }
      this.renderBatchProgress();
      if (this.files.length > previousCount) {
        this.showToast(`Додано: ${this.files.length - previousCount} фото`, "success");
      }
    }
  }

  createFileRecord(rawFile) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target.result;
        const img = new Image();

        img.onload = () => {
          let parsedExif = null;
          let initialStaged = {
            artist: "",
            copyright: "",
            description: "",
            dateTime: "",
            make: "",
            model: "",
            lat: null,
            lon: null,
          };

          if (
            this.piexifAvailable &&
            (rawFile.type === "image/jpeg" ||
              rawFile.type === "image/jpg" ||
              /\.jpe?g$/i.test(rawFile.name))
          ) {
            try {
              parsedExif = window.piexif.load(dataUrl);
              const z = parsedExif["0th"] || {};
              const ex = parsedExif["Exif"] || {};
              const gps = parsedExif["GPS"] || {};

              initialStaged.artist = z[window.piexif.ImageIFD.Artist] || "";
              initialStaged.copyright =
                z[window.piexif.ImageIFD.Copyright] || "";
              initialStaged.description =
                z[window.piexif.ImageIFD.ImageDescription] || "";
              initialStaged.dateTime =
                ex[window.piexif.ExifIFD.DateTimeOriginal] ||
                z[window.piexif.ImageIFD.DateTime] ||
                "";
              initialStaged.make = z[window.piexif.ImageIFD.Make] || "";
              initialStaged.model = z[window.piexif.ImageIFD.Model] || "";

              if (
                gps[window.piexif.GPSIFD.GPSLatitude] &&
                gps[window.piexif.GPSIFD.GPSLongitude]
              ) {
                initialStaged.lat = ExifUtils.exifRationalToDeg(
                  gps[window.piexif.GPSIFD.GPSLatitude],
                  gps[window.piexif.GPSIFD.GPSLatitudeRef],
                );
                initialStaged.lon = ExifUtils.exifRationalToDeg(
                  gps[window.piexif.GPSIFD.GPSLongitude],
                  gps[window.piexif.GPSIFD.GPSLongitudeRef],
                );
              }
            } catch (err) {
              parsedExif = null;
            }
          }

          resolve({
            id: "file_" + Math.random().toString(36).substr(2, 9),
            originalFile: rawFile,
            name: rawFile.name,
            baseName:
              rawFile.name.substring(0, rawFile.name.lastIndexOf(".")) ||
              rawFile.name,
            originalExtension:
              rawFile.name
                .substring(rawFile.name.lastIndexOf("."))
                .toLowerCase() || ".jpg",
            size: rawFile.size,
            type: rawFile.type || "image/jpeg",
            width: img.naturalWidth,
            height: img.naturalHeight,
            originalDataUrl: dataUrl,
            parsedExif: parsedExif,
            initialStaged: JSON.parse(JSON.stringify(initialStaged)),
            stagedEdits: JSON.parse(JSON.stringify(initialStaged)),
            isModified: false,
            isWipedAll: false,
            exportFormat: "jpeg",
            jpegQuality: 0.95,
          });
        };
        img.onerror = () =>
          reject(new Error("Не вдалося декодувати зображення"));
        img.src = dataUrl;
      };
      reader.onerror = () => reject(new Error("Помилка читання файлу"));
      reader.readAsDataURL(rawFile);
    });
  }

  renderFilesTable() {
    if (this.files.length === 0) {
      this.filesTableBody.innerHTML = `<tr><td colspan="5" class="table-empty-row">Файлів ще не додано. Виберіть фотографії вище.</td></tr>`;
      return;
    }

    this.filesTableBody.innerHTML = "";
    this.files.forEach((file, index) => {
      const tr = document.createElement("tr");
      tr.setAttribute("data-index", index);
      if (index === this.currentFileIndex) tr.classList.add("table-row-active");

      let statusHtml = '<span class="status-dot dot-muted"></span>Очікує';
      if (file.isWipedAll) {
        statusHtml = '<span class="status-dot dot-success"></span>Очищено';
      } else if (file.isModified) {
        statusHtml = '<span class="status-dot dot-info"></span>Змінено';
      } else if (file.initialStaged.lat || file.initialStaged.make) {
        statusHtml = '<span class="status-dot dot-warning"></span>Містить EXIF';
      }

      const safeName = this.escapeHtml(file.name);
      tr.innerHTML = `
        <td>
          <div style="display:flex; align-items:center; gap:8px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            <span class="filename-text" title="${safeName}">${safeName}</span>
          </div>
        </td>
        <td>${ExifUtils.formatBytes(file.size)}</td>
        <td>${file.originalExtension.replace(".", "").toUpperCase()}</td>
        <td>${statusHtml}</td>
        <td class="text-right">
          <button type="button" class="btn btn-ghost btn-sm btn-delete-row" title="Видалити">&times;</button>
        </td>
      `;

      tr.addEventListener("click", (e) => {
        if (!e.target.classList.contains("btn-delete-row")) {
          this.selectFile(index);
        }
      });

      tr.querySelector(".btn-delete-row").addEventListener("click", (e) => {
        e.stopPropagation();
        this.removeFile(index);
      });

      this.filesTableBody.appendChild(tr);
    });
  }

  selectFile(index) {
    if (index < 0 || index >= this.files.length) return;
    this.currentFileIndex = index;
    const file = this.files[index];

    this.editorPreviewImg.src = file.originalDataUrl;
    this.editorPreviewImg.classList.remove("hidden");
    this.editorEmptyPreview.classList.add("hidden");
    this.editorFileName.textContent = file.name;
    this.editorFileWeight.textContent = `${ExifUtils.formatBytes(file.size)} • ${file.width}×${file.height}`;

    this.populateEditForm();
    this.renderMetadataViewer();
    this.updateExportFormatUI();
    this.exportFileName.value = file.baseName + "_ready";

    this.renderFilesTable();
  }

  removeFile(index) {
    this.files.splice(index, 1);
    if (this.files.length === 0) {
      this.clearAll();
    } else {
      this.selectFile(Math.max(0, index - 1));
      this.filesCountBadge.textContent = `${this.files.length} файлів`;
      this.renderBatchProgress();
    }
  }

  clearAll() {
    this.files = [];
    this.currentFileIndex = -1;
    this.filesCountBadge.textContent = "0 файлів";
    this.btnTopDownloadZip.disabled = true;
    this.btnBatchZipDownload.disabled = true;
    this.editorPreviewImg.src = "";
    this.editorPreviewImg.classList.add("hidden");
    this.editorEmptyPreview.classList.remove("hidden");
    this.editorFileName.textContent = "—";
    this.editorFileWeight.textContent = "—";
    this.renderFilesTable();
    this.renderBatchProgress();
  }

  syncStagedEdits() {
    const file = this.files[this.currentFileIndex];
    if (!file) return;

    const wasWipedAll = file.isWipedAll;

    file.stagedEdits.artist = this.editArtist.value.trim();
    file.stagedEdits.copyright = this.editCopyright.value.trim();
    file.stagedEdits.description = this.editImageDescription.value.trim();
    file.stagedEdits.dateTime = this.editDateTime.value
      ? ExifUtils.inputToExifDate(this.editDateTime.value)
      : "";
    file.stagedEdits.make = this.editMake.value.trim();
    file.stagedEdits.model = this.editModel.value.trim();

    const lat = parseFloat(this.editGpsLat.value);
    const lon = parseFloat(this.editGpsLon.value);
    file.stagedEdits.lat = isNaN(lat) ? null : lat;
    file.stagedEdits.lon = isNaN(lon) ? null : lon;

    const fieldsAreEmpty = Object.values(file.stagedEdits).every(
      (value) => value === "" || value === null,
    );
    if (wasWipedAll && fieldsAreEmpty) {
      file.isModified = true;
      file.isWipedAll = true;
    } else {
      file.isModified = !this.stagedEditsEqual(file.stagedEdits, file.initialStaged);
      file.isWipedAll = false;
    }
  }

  populateEditForm() {
    const file = this.files[this.currentFileIndex];
    if (!file) return;

    this.editArtist.value = file.stagedEdits.artist || "";
    this.editCopyright.value = file.stagedEdits.copyright || "";
    this.editImageDescription.value = file.stagedEdits.description || "";
    this.editDateTime.value = ExifUtils.exifDateToInput(
      file.stagedEdits.dateTime,
    );
    this.editMake.value = file.stagedEdits.make || "";
    this.editModel.value = file.stagedEdits.model || "";
    this.editGpsLat.value =
      file.stagedEdits.lat !== null ? file.stagedEdits.lat : "";
    this.editGpsLon.value =
      file.stagedEdits.lon !== null ? file.stagedEdits.lon : "";
  }

  renderMetadataViewer() {
    const file = this.files[this.currentFileIndex];
    if (!file) return;

    this.metaTbodyDate.innerHTML = "";
    this.metaTbodyCamera.innerHTML = "";
    this.metaTbodyAuthor.innerHTML = "";
    this.metaTbodyTech.innerHTML = "";
    this.viewGpsBox.classList.add("hidden");

    const addRow = (tbody, k, v) => {
      const tr = document.createElement("tr");
      const key = document.createElement("td");
      const value = document.createElement("td");
      key.textContent = k;
      value.textContent = v;
      tr.append(key, value);
      tbody.appendChild(tr);
    };

    addRow(
      this.metaTbodyTech,
      "Роздільна здатність",
      `${file.width} × ${file.height} px`,
    );
    addRow(
      this.metaTbodyTech,
      "Розмір файлу",
      ExifUtils.formatBytes(file.size),
    );
    addRow(this.metaTbodyTech, "MIME тип", file.type);

    if (file.stagedEdits.dateTime)
      addRow(this.metaTbodyDate, "Дата зйомки", file.stagedEdits.dateTime);
    if (file.stagedEdits.make)
      addRow(this.metaTbodyCamera, "Виробник", file.stagedEdits.make);
    if (file.stagedEdits.model)
      addRow(this.metaTbodyCamera, "Модель", file.stagedEdits.model);
    if (file.stagedEdits.artist)
      addRow(this.metaTbodyAuthor, "Автор", file.stagedEdits.artist);
    if (file.stagedEdits.copyright)
      addRow(this.metaTbodyAuthor, "Копірайт", file.stagedEdits.copyright);

    if (file.stagedEdits.lat !== null && file.stagedEdits.lon !== null) {
      this.viewGpsBox.classList.remove("hidden");
      this.viewGpsCoords.textContent = `${file.stagedEdits.lat}, ${file.stagedEdits.lon}`;
      this.viewGpsLink.href = `https://www.openstreetmap.org/?mlat=${file.stagedEdits.lat}&mlon=${file.stagedEdits.lon}#map=16/${file.stagedEdits.lat}/${file.stagedEdits.lon}`;
    }

    [this.metaTbodyDate, this.metaTbodyCamera, this.metaTbodyAuthor].forEach((tbody) => {
      if (!tbody.children.length) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");
        cell.className = "empty-cell";
        cell.textContent = "Відсутні";
        row.appendChild(cell);
        tbody.appendChild(row);
      }
    });
  }

  executeCleaningPreset(preset) {
    const file = this.files[this.currentFileIndex];
    if (!file) return;

    if (preset === "all") {
      file.stagedEdits = {
        artist: "",
        copyright: "",
        description: "",
        dateTime: "",
        make: "",
        model: "",
        lat: null,
        lon: null,
      };
      file.isWipedAll = true;
      file.isModified = true;
      this.showToast("Метадані повністю очищено", "success");
    } else if (preset === "gps") {
      file.stagedEdits.lat = null;
      file.stagedEdits.lon = null;
      file.isModified = true;
      this.showToast("GPS координати видалено", "info");
    } else if (preset === "device") {
      file.stagedEdits.make = "";
      file.stagedEdits.model = "";
      file.isModified = true;
      this.showToast("Дані пристрою видалено", "info");
    } else if (preset === "author") {
      file.stagedEdits.artist = "";
      file.stagedEdits.copyright = "";
      file.stagedEdits.description = "";
      file.isModified = true;
      this.showToast("Авторські поля видалено", "info");
    }

    this.populateEditForm();
    this.renderMetadataViewer();
    this.renderFilesTable();
    this.updateExportFormatUI();
    this.renderBatchProgress();
  }

  executeBatchCleaning(preset) {
    if (!this.files.length) {
      this.showToast("Спочатку додайте фотографії", "warning");
      return;
    }
    this.files.forEach((_, idx) => {
      this.currentFileIndex = idx;
      this.executeCleaningPreset(preset);
    });
    this.showToast(`Пакетно очищено ${this.files.length} файлів`, "success");
    this.renderBatchProgress();
  }

  renderBatchProgress() {
    const total = this.files.length;
    const processed = this.files.filter((file) => file.isModified || file.isWipedAll).length;
    const percent = total ? Math.round((processed / total) * 100) : 0;
    if (this.batchProgressPercent) this.batchProgressPercent.textContent = `${percent}%`;
    if (this.batchProgressBar) this.batchProgressBar.style.width = `${percent}%`;
  }

  updateExportFormatUI() {
    const file = this.files[this.currentFileIndex];
    if (!file) return;

    this.selectExportFormat.value = file.exportFormat;
    this.rangeJpegQuality.value = Math.round(file.jpegQuality * 100);
    this.labelQualityPercent.textContent = `${this.rangeJpegQuality.value}%`;

    const isJpeg =
      file.exportFormat === "jpeg" ||
      (file.exportFormat === "original" &&
        /jpe?g$/i.test(file.originalExtension));
    this.qualityControlGroup.style.display = isJpeg ? "flex" : "none";
    this.exportExtensionBadge.textContent =
      this.getOutputExtension(file);
  }

  async buildTargetDataUrl(file) {
    const formatChoice = this.selectExportFormat.value;
    file.exportFormat = formatChoice;
    file.jpegQuality = parseInt(this.rangeJpegQuality.value, 10) / 100;

    let baseJpegDataUrl = null;
    const isSourceJpeg =
      file.type === "image/jpeg" ||
      file.type === "image/jpg" ||
      /\.jpe?g$/i.test(file.name);

    if (formatChoice === "jpeg" || !isSourceJpeg) {
      baseJpegDataUrl = await this.rasterizeToJpeg(
        file.originalDataUrl,
        file.jpegQuality,
      );
    } else {
      baseJpegDataUrl = file.originalDataUrl;
    }

    if (file.isWipedAll) {
      if (this.piexifAvailable && (formatChoice === "jpeg" || isSourceJpeg)) {
        try {
          return window.piexif.remove(baseJpegDataUrl);
        } catch (e) {
          return baseJpegDataUrl;
        }
      }
      return baseJpegDataUrl;
    }

    if (this.piexifAvailable && (formatChoice === "jpeg" || isSourceJpeg)) {
      try {
        const cleanBase = window.piexif.remove(baseJpegDataUrl);
        const newExif = {
          "0th": {},
          Exif: {},
          GPS: {},
          "1st": {},
          thumbnail: null,
        };

        if (file.stagedEdits.artist)
          newExif["0th"][window.piexif.ImageIFD.Artist] =
            file.stagedEdits.artist;
        if (file.stagedEdits.copyright)
          newExif["0th"][window.piexif.ImageIFD.Copyright] =
            file.stagedEdits.copyright;
        if (file.stagedEdits.description)
          newExif["0th"][window.piexif.ImageIFD.ImageDescription] =
            file.stagedEdits.description;
        if (file.stagedEdits.make)
          newExif["0th"][window.piexif.ImageIFD.Make] = file.stagedEdits.make;
        if (file.stagedEdits.model)
          newExif["0th"][window.piexif.ImageIFD.Model] = file.stagedEdits.model;

        if (file.stagedEdits.dateTime) {
          newExif["Exif"][window.piexif.ExifIFD.DateTimeOriginal] =
            file.stagedEdits.dateTime;
          newExif["0th"][window.piexif.ImageIFD.DateTime] =
            file.stagedEdits.dateTime;
        }

        if (file.stagedEdits.lat !== null && file.stagedEdits.lon !== null) {
          newExif["GPS"][window.piexif.GPSIFD.GPSVersionID] = [2, 2, 0, 0];
          newExif["GPS"][window.piexif.GPSIFD.GPSLatitudeRef] =
            file.stagedEdits.lat >= 0 ? "N" : "S";
          newExif["GPS"][window.piexif.GPSIFD.GPSLatitude] =
            ExifUtils.degToExifRational(file.stagedEdits.lat);
          newExif["GPS"][window.piexif.GPSIFD.GPSLongitudeRef] =
            file.stagedEdits.lon >= 0 ? "E" : "W";
          newExif["GPS"][window.piexif.GPSIFD.GPSLongitude] =
            ExifUtils.degToExifRational(file.stagedEdits.lon);
        }

        const exifBytes = window.piexif.dump(newExif);
        return window.piexif.insert(exifBytes, cleanBase);
      } catch (err) {
        console.warn("EXIF injection fallback:", err);
        return baseJpegDataUrl;
      }
    }

    // PNG/WebP cannot receive EXIF through piexif. If the user changed or
    // removed metadata, export a clean JPEG instead of silently returning the
    // untouched source under a misleading filename.
    if (!isSourceJpeg && (file.isModified || file.isWipedAll)) {
      return baseJpegDataUrl;
    }

    return file.originalDataUrl;
  }

  rasterizeToJpeg(sourceDataUrl, quality) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = sourceDataUrl;
    });
  }

  async downloadActiveFile() {
    const file = this.files[this.currentFileIndex];
    if (!file) return;

    this.syncStagedEdits();
    const resultDataUrl = await this.buildTargetDataUrl(file);
    const targetExt = this.getOutputExtension(file);
    const finalName =
      (this.exportFileName.value.trim() || file.baseName) + targetExt;

    const savedWithShareSheet = await this.saveForDevice(resultDataUrl, finalName);
    this.showToast(
      savedWithShareSheet
        ? "Відкрито меню iPhone — виберіть «Зберегти у Файли»"
        : `Експортовано: ${finalName}`,
      "success",
    );
  }

  async verifyActiveFileIntegrity() {
    const file = this.files[this.currentFileIndex];
    if (!file) return;

    this.syncStagedEdits();
    const resultDataUrl = await this.buildTargetDataUrl(file);

    this.exportAuditNotice.classList.remove("hidden");

    if (file.isWipedAll) {
      this.exportAuditDetails.textContent =
        "Усі службові EXIF/GPS чанки повністю відсутні у файлі.";
      return;
    }

    try {
      const readBack = window.piexif.load(resultDataUrl);
      const author =
        readBack["0th"]?.[window.piexif.ImageIFD.Artist] || "[Порожньо]";
      const make =
        readBack["0th"]?.[window.piexif.ImageIFD.Make] || "[Порожньо]";
      const hasGps = readBack["GPS"]?.[window.piexif.GPSIFD.GPSLatitude]
        ? "Присутні"
        : "Відсутні";

      this.exportAuditDetails.textContent =
        `Формат: ${this.selectExportFormat.value.toUpperCase()} • ` +
        `Автор: ${author} • Камера: ${make} • GPS: ${hasGps}`;
    } catch (e) {
      this.exportAuditDetails.textContent =
        "EXIF структури не виявлено (чистий потік).";
    }
  }

  async exportAllAsZip() {
    if (!this.jszipAvailable || this.files.length === 0) return;

    this.showToast("Формування ZIP архіву...", "info");
    const zip = new window.JSZip();

    for (let i = 0; i < this.files.length; i++) {
      const f = this.files[i];
      const dataUrl = await this.buildTargetDataUrl(f);
      const ext = this.getOutputExtension(f);
      const base64 = dataUrl.split(",")[1];
      zip.file(`${f.baseName}_cleaned_${i + 1}${ext}`, base64, {
        base64: true,
      });
    }

    const zipBlob = await zip.generateAsync({ type: "blob" });
    const savedWithShareSheet = await this.saveBlobForDevice(zipBlob, "photos_cleaned.zip");
    this.showToast(
      savedWithShareSheet
        ? "Відкрито меню iPhone — виберіть «Зберегти у Файли»"
        : "ZIP-архів успішно завантажено",
      "success",
    );
  }

  async saveForDevice(dataUrl, filename) {
    const response = await fetch(dataUrl);
    return this.saveBlobForDevice(await response.blob(), filename);
  }

  async saveBlobForDevice(blob, filename) {
    const isAppleMobile = /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const file = new File([blob], filename, { type: blob.type || "application/octet-stream" });

    // iOS Safari does not reliably honour the download attribute. The native
    // share sheet gives the person an explicit "Save to Files" path instead.
    if (isAppleMobile && navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
      try {
        await navigator.share({ files: [file], title: filename });
        return true;
      } catch (error) {
        if (error?.name === "AbortError") return true;
      }
    }

    const objectUrl = URL.createObjectURL(blob);
    this.triggerDownload(objectUrl, filename);
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
    return false;
  }

  triggerDownload(url, filename) {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  renderDiff() {
    const file = this.files[this.currentFileIndex];
    if (!file) return;

    this.diffOriginalList.innerHTML = "";
    this.diffModifiedList.innerHTML = "";

    const addDiff = (title, origVal, modVal) => {
      const liOrig = document.createElement("li");
      liOrig.textContent = `${title}: ${origVal || "[немає]"}`;
      this.diffOriginalList.appendChild(liOrig);

      const liMod = document.createElement("li");
      if (!modVal && origVal) {
        liMod.className = "diff-removed";
        liMod.textContent = `${title}: [видалено]`;
      } else if (modVal && !origVal) {
        liMod.className = "diff-added";
        liMod.textContent = `${title}: ${modVal}`;
      } else if (modVal !== origVal) {
        liMod.className = "diff-changed";
        liMod.textContent = `${title}: ${modVal}`;
      } else {
        liMod.textContent = `${title}: ${modVal || "[порожньо]"}`;
      }
      this.diffModifiedList.appendChild(liMod);
    };

    const orig = file.initialStaged;
    const cur = file.stagedEdits;

    addDiff(
      "Формат",
      file.originalExtension.toUpperCase(),
      this.selectExportFormat.value.toUpperCase(),
    );
    addDiff("Автор", orig.artist, cur.artist);
    addDiff("Камера", orig.model, cur.model);
    addDiff("Дата", orig.dateTime, cur.dateTime);
    addDiff(
      "GPS",
      orig.lat ? `${orig.lat}, ${orig.lon}` : null,
      cur.lat ? `${cur.lat}, ${cur.lon}` : null,
    );
  }

  stagedEditsEqual(first, second) {
    return JSON.stringify(first) === JSON.stringify(second);
  }

  getOutputExtension(file) {
    const isSourceJpeg = /\.jpe?g$/i.test(file.name);
    if (
      this.selectExportFormat.value === "jpeg" ||
      (!isSourceJpeg && (file.isModified || file.isWipedAll))
    ) {
      return ".jpg";
    }
    return file.originalExtension;
  }

  escapeHtml(value) {
    const element = document.createElement("span");
    element.textContent = value;
    return element.innerHTML;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  window.app = new PhotoMetadataStudio();
});
