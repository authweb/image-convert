document.addEventListener('DOMContentLoaded', function () {
  class ImageConverter {
    constructor() {
      this.elements = {
        dropZone: document.getElementById('dropZone'),
        imageInput: document.getElementById('imageInput'),
        formatSelect: document.getElementById('formatSelect'),
        convertAllButton: document.getElementById('convertAllButton'),
        clearAllButton: document.getElementById('clearAllButton'),
        imageList: document.getElementById('imageList'),
        emptyState: document.getElementById('emptyState'),
        progressContainer: document.getElementById('progressContainer'),
        progressBar: document.getElementById('progressBar'),
        progressText: document.getElementById('progressText'),
        themeToggle: document.getElementById('themeToggle'),
        qualityContainer: document.getElementById('qualityContainer'),
        qualitySlider: document.getElementById('qualitySlider'),
        qualityValue: document.getElementById('qualityValue'),
      };

      this.images = [];
      this.selectedFormat = 'jpeg';
      this.init();
    }

    init() {
      this.initTheme();
      this.setupEventListeners();
    }

    initTheme() {
      const savedTheme =
        localStorage.getItem('theme') ||
        (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

      if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
        this.elements.themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
      } else {
        document.documentElement.classList.remove('dark');
        this.elements.themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
      }
    }

    setupEventListeners() {
      // Переключение темы
      this.elements.themeToggle.addEventListener('click', () => this.toggleTheme());

      // Настройки формата и качества
      this.elements.formatSelect.addEventListener('change', () => {
        this.elements.qualityContainer.classList.toggle(
          'hidden',
          this.elements.formatSelect.value !== 'jpeg',
        );
      });

      this.elements.qualitySlider.addEventListener('input', () => {
        this.elements.qualityValue.textContent = `${this.elements.qualitySlider.value}%`;
      });

      // Drag and drop
      ['dragenter', 'dragover', 'dragleave', 'drop'].forEach((eventName) => {
        this.elements.dropZone.addEventListener(eventName, this.preventDefaults, false);
      });

      ['dragenter', 'dragover'].forEach((eventName) => {
        this.elements.dropZone.addEventListener(eventName, () => this.highlightDropZone(), false);
      });

      ['dragleave', 'drop'].forEach((eventName) => {
        this.elements.dropZone.addEventListener(eventName, () => this.unhighlightDropZone(), false);
      });

      this.elements.dropZone.addEventListener('drop', (e) => this.handleDrop(e));
      this.elements.imageInput.addEventListener('change', () =>
        this.handleFiles(this.elements.imageInput.files),
      );

      // Кнопки действий
      this.elements.convertAllButton.addEventListener('click', () => this.convertAll());
      this.elements.clearAllButton.addEventListener('click', () => this.clearAllImages());
    }

    toggleTheme() {
      document.documentElement.classList.toggle('dark');
      const isDark = document.documentElement.classList.contains('dark');
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
      this.elements.themeToggle.innerHTML = isDark
        ? '<i class="fas fa-sun"></i>'
        : '<i class="fas fa-moon"></i>';
    }

    preventDefaults(e) {
      e.preventDefault();
      e.stopPropagation();
    }

    highlightDropZone() {
      this.elements.dropZone.classList.add('drag-over');
    }

    unhighlightDropZone() {
      this.elements.dropZone.classList.remove('drag-over');
    }

    handleDrop(e) {
      const dt = e.dataTransfer;
      const files = dt.files;
      this.handleFiles(files);
    }

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
                <img src="${img.src}" alt="${img.name}" class="w-16 h-16 object-cover rounded-lg">
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

    async convertImages(imagesToConvert) {
      const format = this.elements.formatSelect.value;
      const quality = this.elements.qualitySlider.value / 100;
      const mimeType = `image/${format}`;

      this.showProgress(0, 'Подготовка к конвертации...');

      try {
        for (let i = 0; i < imagesToConvert.length; i++) {
          const img = imagesToConvert[i];
          const dataURL = await this.convertImageToDataURL(img.src, mimeType, quality);
          const link = document.createElement('a');
          link.href = dataURL;
          link.download = `converted_${i + 1}.${format}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          const progress = Math.round(((i + 1) / imagesToConvert.length) * 100);
          this.showProgress(progress, `Обработано ${i + 1} из ${imagesToConvert.length}`);
        }

        this.showToast('Изображения успешно конвертированы', 'success');
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

    showProgress(percent, message) {
      this.elements.progressContainer.classList.remove('hidden');
      this.elements.progressBar.style.width = `${percent}%`;
      this.elements.progressText.textContent = message;
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

  // Инициализация приложения
  const imageConverter = new ImageConverter();
  window.imageConverter = imageConverter;
});
