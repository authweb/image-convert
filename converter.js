document.addEventListener('DOMContentLoaded', function () {
  const dropZone = document.getElementById('dropZone');
  const imageInput = document.getElementById('imageInput');
  const formatSelect = document.getElementById('formatSelect');
  const convertAllButton = document.getElementById('convertAllButton');
  const convertSelectedButton = document.getElementById('convertSelectedButton');
  const clearAllButton = document.getElementById('clearAllButton');
  const imageList = document.getElementById('imageList');
  const emptyState = document.getElementById('emptyState');
  const progressContainer = document.getElementById('progressContainer');
  const progressBar = document.getElementById('progressBar');
  const progressText = document.getElementById('progressText');
  const themeToggle = document.getElementById('themeToggle');
  const qualityContainer = document.getElementById('qualityContainer');
  const qualitySlider = document.getElementById('qualitySlider');
  const qualityValue = document.getElementById('qualityValue');

  let images = []; // Массив для хранения загруженных изображений

  // Инициализация темы
  function initTheme() {
    const savedTheme =
      localStorage.getItem('theme') ||
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
      themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    } else {
      document.documentElement.classList.remove('dark');
      themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
    }
  }

  // Переключение темы
  themeToggle.addEventListener('click', function () {
    document.documentElement.classList.toggle('dark');
    const isDark = document.documentElement.classList.contains('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    themeToggle.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
  });

  // Показываем настройку качества только для JPG
  formatSelect.addEventListener('change', function () {
    qualityContainer.classList.toggle('hidden', this.value !== 'jpeg');
  });

  // Обновляем значение качества
  qualitySlider.addEventListener('input', function () {
    qualityValue.textContent = `${this.value}%`;
  });

  // Drag-and-drop
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach((eventName) => {
    dropZone.addEventListener(eventName, preventDefaults, false);
  });

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  highlightDropZone() {
    this.elements.dropZone.classList.add('drag-over');
  }

  unhighlightDropZone() {
    this.elements.dropZone.classList.remove('drag-over');
  }

  dropZone.addEventListener('drop', function (e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFiles(files);
  });

  // Выбор файлов через input
  imageInput.addEventListener('change', function () {
    handleFiles(this.files);
  });

  async handleFiles(files) {
    if (!files.length) return;

    this.elements.emptyState.classList.add('hidden');
    const validFiles = Array.from(files).filter((file) => file.type.startsWith('image/'));

    if (validFiles.length !== files.length) {
      this.showToast('Некоторые файлы не являются изображениями', 'warning');
    }

    for (const file of validFiles) {
      try {
        const imgData = await this.readFileAsImage(file);
        this.images.push({
          file,
          src: imgData.src,
          name: file.name,
          size: file.size,
          width: imgData.width,
          height: imgData.height,
        });
      } catch (error) {
        console.error('Ошибка загрузки изображения:', error);
      }
    }

    this.renderImageList();
  }

  readFileAsImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () =>
          resolve({
            src: event.target.result,
            width: img.width,
            height: img.height,
          });
        img.onerror = reject;
        img.src = event.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  renderImageList() {
    if (this.images.length === 0) {
      this.elements.emptyState.classList.remove('hidden');
      this.elements.imageList.innerHTML = '';
      return;
    }

    this.elements.emptyState.classList.add('hidden');
    this.elements.imageList.innerHTML = this.images
      .map(
        (img, index) => `
                <div class="file-card flex items-center gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg mb-3">
                    <img src="${img.src}" alt="${
          img.name
        }" class="w-16 h-16 object-cover rounded-lg">
                    <div class="flex-1 truncate">
                        <p class="text-gray-700 dark:text-gray-300 truncate">${img.name}</p>
                        <p class="text-xs text-gray-500">${this.formatFileSize(img.size)} • ${
          img.width
        }×${img.height}</p>
                    </div>
                    <button onclick="imageConverter.removeSingleImage(${index})" 
                            class="text-red-500 hover:text-red-700 p-2 rounded-full">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            `,
      )
      .join('');
  }

  formatFileSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  removeSingleImage(index) {
    this.images.splice(index, 1);
    this.renderImageList();
    if (this.images.length === 0) {
      this.elements.emptyState.classList.remove('hidden');
    }
  }

  clearAllImages() {
    Swal.fire({
      title: 'Очистить все?',
      text: 'Вы уверены, что хотите удалить все загруженные изображения?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Да, очистить',
      cancelButtonText: 'Отмена',
      confirmButtonColor: '#d33',
    }).then((result) => {
      if (result.isConfirmed) {
        this.images = [];
        this.renderImageList();
        this.elements.emptyState.classList.remove('hidden');
        this.elements.imageInput.value = '';
        this.showToast('Все изображения удалены', 'success');
      }
    });
  }

  convertAll() {
    if (this.images.length === 0) {
      this.showToast('Пожалуйста, загрузите изображения', 'error');
      return;
    }
    this.convertImages(this.images);
  }

  async downloadAll() {
    if (this.images.length === 0) {
      this.showToast('Нет изображений для скачивания', 'error');
      return;
    }
    await this.convertImages(this.images, true);
  }

  async convertImages(imagesToConvert, forceDownload = false) {
    const format = this.selectedFormat;
    const quality = format === 'jpeg' ? this.elements.qualitySlider.value / 100 : 1;
    const mimeType = `image/${format}`;

    this.showProgress(0, 'Подготовка к конвертации...');

    try {
      if (imagesToConvert.length > 1 || forceDownload) {
        const zip = new JSZip();
        const folder = zip.folder('converted_images');

        for (let i = 0; i < imagesToConvert.length; i++) {
          const img = imagesToConvert[i];
          const dataURL = await convertImageToDataURL(img.src, mimeType, quality);
          const blob = dataURLtoBlob(dataURL);
          folder.file(`image_${i + 1}.${format}`, blob);

          const progress = Math.round(((i + 1) / imagesToConvert.length) * 100);
          this.showProgress(progress, `Обработка ${i + 1} из ${imagesToConvert.length}`);
        }

        const content = await zip.generateAsync({ type: 'blob' });
        saveAs(content, 'converted_images.zip');
      } else {
        for (let i = 0; i < imagesToConvert.length; i++) {
          const img = imagesToConvert[i];
          const dataURL = await convertImageToDataURL(img.src, mimeType, quality);
          const link = document.createElement('a');
          link.href = dataURL;
          link.download = `converted_${i + 1}.${format}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          const progress = Math.round(((i + 1) / imagesToConvert.length) * 100);
          progressBar.style.width = `${progress}%`;
          progressText.textContent = `${progress}% завершено`;
        }
      }

      Swal.fire('Готово!', 'Изображения успешно конвертированы', 'success');
    } catch (error) {
      console.error('Ошибка конвертации:', error);
      this.showToast('Произошла ошибка при конвертации', 'error');
    } finally {
      this.hideProgress();
    }
  }

  convertImageToDataURL(src, mimeType, quality) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL(mimeType, quality));
        canvas.remove();
      };
      img.src = src;
    });
  }

  dataURLtoBlob(dataURL) {
    const byteString = atob(dataURL.split(',')[1]);
    const mimeString = dataURL.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeString });
  }

  downloadFile(dataURL, filename) {
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  showProgress(percent, message) {
    this.elements.progressContainer.classList.remove('hidden');
    this.elements.progressBar.style.width = `${percent}%`;
    this.elements.progressText.textContent = `${percent}%`;
    if (message) {
      document.querySelector('#progressContainer p').textContent = message;
    }
  }

  hideProgress() {
    this.elements.progressContainer.classList.add('hidden');
  }

  showToast(message, type = 'success') {
    const icon = {
      success: 'check-circle',
      error: 'exclamation-triangle',
      warning: 'exclamation-circle',
    }[type];

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
            <i class="fas fa-${icon} mr-2"></i>
            <span>${message}</span>
        `;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
}

// Инициализация при загрузке страницы
let imageConverter;
document.addEventListener('DOMContentLoaded', () => {
  imageConverter = new ImageConverter();
  window.imageConverter = imageConverter; // Делаем глобально доступным для обработчиков в HTML
});
