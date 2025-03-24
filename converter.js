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

  ['dragenter', 'dragover'].forEach((eventName) => {
    dropZone.addEventListener(eventName, highlight, false);
  });

  ['dragleave', 'drop'].forEach((eventName) => {
    dropZone.addEventListener(eventName, unhighlight, false);
  });

  function highlight() {
    dropZone.classList.add('drag-over');
  }

  function unhighlight() {
    dropZone.classList.remove('drag-over');
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

  // Обработка загруженных файлов
  function handleFiles(files) {
    if (!files.length) return;

    emptyState.classList.add('hidden');

    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        Swal.fire('Ошибка!', `Файл "${file.name}" не является изображением`, 'error');
        continue;
      }

      const reader = new FileReader();
      reader.onload = function (event) {
        const img = new Image();
        img.onload = function () {
          images.push({
            file,
            src: event.target.result,
            checked: true,
          });
          renderImageList();
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  // Отображение списка изображений
  function renderImageList() {
    if (images.length === 0) {
      emptyState.classList.remove('hidden');
      imageList.innerHTML = '';
      return;
    }

    imageList.innerHTML = images
      .map(
        (img, index) => `
      <div class="file-card flex items-center gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg mb-3">
        <input type="checkbox" ${img.checked ? 'checked' : ''} 
               onchange="window.toggleImage(${index})" 
               class="form-checkbox h-5 w-5 text-blue-500">
        <img src="${img.src}" alt="${img.file.name}" class="w-16 h-16 object-cover rounded-lg">
        <div class="flex-1 truncate">
          <p class="text-gray-700 dark:text-gray-300 truncate">${img.file.name}</p>
          <p class="text-xs text-gray-500">${(img.file.size / 1024).toFixed(2)} KB</p>
        </div>
        <button onclick="window.removeImage(${index})" 
                class="text-red-500 hover:text-red-700 p-2 rounded-full">
          <i class="fas fa-trash-alt"></i>
        </button>
      </div>
    `,
      )
      .join('');
  }

  // Очистка всех изображений
  clearAllButton.addEventListener('click', function () {
    images = [];
    renderImageList();
    emptyState.classList.remove('hidden');
  });

  // Конвертация всех изображений
  convertAllButton.addEventListener('click', function () {
    if (images.length === 0) {
      Swal.fire('Ошибка!', 'Пожалуйста, загрузите изображения', 'error');
      return;
    }
    convertImages(images);
  });

  // Конвертация выбранных изображений
  convertSelectedButton.addEventListener('click', function () {
    const selectedImages = images.filter((img) => img.checked);
    if (selectedImages.length === 0) {
      Swal.fire('Ошибка!', 'Пожалуйста, выберите изображения', 'error');
      return;
    }
    convertImages(selectedImages);
  });

  // Конвертация изображений
  async function convertImages(imagesToConvert) {
    const format = formatSelect.value;
    const quality = format === 'jpeg' ? qualitySlider.value / 100 : 1;
    const mimeType = `image/${format}`;

    progressContainer.classList.remove('hidden');
    progressBar.style.width = '0%';
    progressText.textContent = '0% завершено';

    try {
      if (imagesToConvert.length > 5) {
        const zip = new JSZip();
        const folder = zip.folder('converted_images');

        for (let i = 0; i < imagesToConvert.length; i++) {
          const img = imagesToConvert[i];
          const dataURL = await convertImageToDataURL(img.src, mimeType, quality);
          const blob = dataURLtoBlob(dataURL);
          folder.file(`image_${i + 1}.${format}`, blob);

          const progress = Math.round(((i + 1) / imagesToConvert.length) * 100);
          progressBar.style.width = `${progress}%`;
          progressText.textContent = `${progress}% завершено`;
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
      Swal.fire('Ошибка!', 'Произошла ошибка при конвертации', 'error');
      console.error(error);
    } finally {
      progressContainer.classList.add('hidden');
    }
  }

  // Конвертация изображения в Data URL
  function convertImageToDataURL(src, mimeType, quality) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = function () {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL(mimeType, quality));
      };
      img.src = src;
    });
  }

  // Преобразование Data URL в Blob
  function dataURLtoBlob(dataURL) {
    const byteString = atob(dataURL.split(',')[1]);
    const mimeString = dataURL.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeString });
  }

  // Глобальные функции для работы с изображениями
  window.toggleImage = function (index) {
    images[index].checked = !images[index].checked;
    renderImageList();
  };

  window.removeImage = function (index) {
    images.splice(index, 1);
    renderImageList();
    if (images.length === 0) {
      emptyState.classList.remove('hidden');
    }
  };

  // Инициализация
  initTheme();
});
