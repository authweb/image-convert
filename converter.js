document.addEventListener('DOMContentLoaded', function () {
  const dropZone = document.getElementById('dropZone');
  const imageInput = document.getElementById('imageInput');
  const formatSelect = document.getElementById('formatSelect');
  const convertAllButton = document.getElementById('convertAllButton');
  const convertSelectedButton = document.getElementById('convertSelectedButton');
  const imageList = document.getElementById('imageList');
  const progressContainer = document.getElementById('progressContainer');
  const progressBar = document.getElementById('progressBar');
  const progressText = document.getElementById('progressText');
  const themeToggle = document.getElementById('themeToggle');

  let images = []; // Массив для хранения загруженных изображений

  tailwind.config = {
    darkMode: 'class', // Используем class стратегию для темной темы
  };

  // Инициализация темы
  const savedTheme = localStorage.getItem('theme');
  if (!savedTheme) {
    // Если тема не сохранена, используем системные настройки
    const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (isSystemDark) {
      document.documentElement.classList.add('dark'); // Добавляем класс dark к <html>
      themeToggle.textContent = '☀️';
    } else {
      document.documentElement.classList.remove('dark'); // Убираем класс dark
      themeToggle.textContent = '🌙';
    }
  } else if (savedTheme === 'dark') {
    document.documentElement.classList.add('dark'); // Добавляем класс dark
    themeToggle.textContent = '☀️';
  } else {
    document.documentElement.classList.remove('dark'); // Убираем класс dark
    themeToggle.textContent = '🌙';
  }

  // Переключение темы
  themeToggle.addEventListener('click', function () {
    document.documentElement.classList.toggle('dark'); // Переключаем класс dark на <html>
    if (document.documentElement.classList.contains('dark')) {
      localStorage.setItem('theme', 'dark');
      themeToggle.textContent = '☀️';
    } else {
      localStorage.setItem('theme', 'light');
      themeToggle.textContent = '🌙';
    }
  });

  // Drag-and-drop
  dropZone.addEventListener('dragover', function (e) {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });

  dropZone.addEventListener('dragleave', function () {
    dropZone.classList.remove('drag-over');
  });

  dropZone.addEventListener('drop', function (e) {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const files = e.dataTransfer.files;
    handleFiles(files);
  });

  // Выбор файлов через input
  imageInput.addEventListener('change', function () {
    const files = imageInput.files;
    handleFiles(files);
  });

  // Конвертация всех изображений
  convertAllButton.addEventListener('click', function () {
    if (images.length === 0) {
      Swal.fire('Ошибка!', 'Пожалуйста, загрузите изображения.', 'error');
      return;
    }
    convertImages(images);
  });

  // Конвертация выбранных изображений
  convertSelectedButton.addEventListener('click', function () {
    const selectedImages = images.filter((img) => img.checked);
    if (selectedImages.length === 0) {
      Swal.fire('Ошибка!', 'Пожалуйста, выберите изображения для конвертации.', 'error');
      return;
    }
    convertImages(selectedImages);
  });

  // Обработка загруженных файлов
  function handleFiles(files) {
    for (const file of files) {
      if (file.type.startsWith('image/')) {
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
      } else {
        Swal.fire('Ошибка!', `Файл "${file.name}" не является изображением.`, 'error');
      }
    }
  }

  // Отображение списка изображений
  function renderImageList() {
    imageList.innerHTML = images
      .map(
        (img, index) => `
					<div class="flex items-center gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
						<input type="checkbox" ${
              img.checked ? 'checked' : ''
            } onchange="toggleImage(${index})" class="form-checkbox h-5 w-5 text-blue-500">
						<img src="${img.src}" alt="Image" class="w-16 h-16 object-cover rounded-lg">
						<span class="text-gray-700 dark:text-gray-300">${img.file.name}</span>
						<button onclick="removeImage(${index})" class="ml-auto text-red-500 hover:text-red-700">Удалить</button>
					</div>
				`,
      )
      .join('');
  }

  // Переключение выбора изображения
  window.toggleImage = function (index) {
    images[index].checked = !images[index].checked;
  };

  // Удаление изображения
  window.removeImage = function (index) {
    images.splice(index, 1);
    renderImageList();
  };

  // Конвертация изображений
  async function convertImages(imagesToConvert) {
    const format = formatSelect.value;
    const mimeType = `image/${format}`;

    progressContainer.classList.remove('hidden');
    progressBar.style.width = '0%';
    progressText.textContent = '0% завершено';

    if (imagesToConvert.length > 5) {
      const zip = new JSZip();
      const folder = zip.folder('converted_images');

      for (let i = 0; i < imagesToConvert.length; i++) {
        const img = imagesToConvert[i];
        const dataURL = await convertImageToDataURL(img.src, mimeType);
        const blob = dataURLtoBlob(dataURL);
        folder.file(`image_${i + 1}.${format}`, blob);

        const progress = Math.round(((i + 1) / imagesToConvert.length) * 100);
        progressBar.style.width = `${progress}%`;
        progressText.textContent = `${progress}% завершено`;
      }

      zip.generateAsync({ type: 'blob' }).then(function (content) {
        saveAs(content, 'converted_images.zip');
        progressContainer.classList.add('hidden');
        Swal.fire('Готово!', 'Архив успешно создан и скачан.', 'success');
      });
    } else {
      for (let i = 0; i < imagesToConvert.length; i++) {
        const img = imagesToConvert[i];
        const dataURL = await convertImageToDataURL(img.src, mimeType);
        const link = document.createElement('a');
        link.href = dataURL;
        link.download = `converted_${i + 1}.${format}`;
        link.click();

        const progress = Math.round(((i + 1) / imagesToConvert.length) * 100);
        progressBar.style.width = `${progress}%`;
        progressText.textContent = `${progress}% завершено`;
      }
      progressContainer.classList.add('hidden');
      Swal.fire('Готово!', 'Изображения успешно конвертированы.', 'success');
    }
  }

  // Конвертация изображения в Data URL
  function convertImageToDataURL(src, mimeType) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = function () {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL(mimeType));
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
});
