document.addEventListener('DOMContentLoaded', () => {
    // Initialize Splash Screen first
    class SugamSplash {
        constructor(options = {}) {
            this.options = Object.assign({
                timeout: 15000, minDisplayTime: 4500, signatureName: "picvaan",
                mainContentSelector: '.main-content', theme: 'dark',
                lineLoadDuration: 3000,
                onShowStart: null, onShowComplete: null, onHideStart: null, onHideComplete: null,
            }, options);
            this.splashElement = document.getElementById('sugam-splash-screen');
            this.isVisible = true; 
            this.animationTimeline = null;
            this.splashShownTimestamp = Date.now();
            this.windowLoadFired = false;
            this.maxTimeoutId = null;
            this.minDisplayTimeoutId = null;
            this._setupElements();
        }
        
        _setupElements() {
            this.signatureEl = this.splashElement.querySelector('.sugam-splash-signature');
            this.nameCharsEl = this.splashElement.querySelectorAll('.sugam-name span');
            this.loaderLineContainerEl = this.splashElement.querySelector('.sugam-splash-loader-line-container');
            this.loaderLineFillEl = this.splashElement.querySelector('.sugam-splash-loader-line-fill');
        }
        
        _executeCallback(callbackName, ...args) { 
            if (typeof this.options[callbackName] === 'function') { 
                try { this.options[callbackName].apply(null, args); } 
                catch (e) { console.error(`Error in SugamSplash callback '${callbackName}':`, e); } 
            } 
        }
        
        show() {
            this._executeCallback('onShowStart');
            document.body.style.overflow = 'hidden';
            this.splashElement.classList.add('sugam-splash-visible');
            this.splashElement.style.animationPlayState = 'running';

            this.animationTimeline = gsap.timeline({
                onComplete: () => {
                    this._executeCallback('onShowComplete');
                }
            });
            this.animationTimeline
                .to(this.splashElement, { opacity: 1, duration: 1.0, ease: "power2.inOut" })
                .to(this.signatureEl, { opacity: 1, y: 0, duration: 1.2, ease: "expo.out" }, "-=0.6")
                .to(this.nameCharsEl, {
                    opacity: 1, y: 0, scale: 1, rotateX: 0, filter: 'blur(0px)',
                    duration: 1.0, stagger: 0.15, ease: "expo.out",
                }, "-=0.8")
                .to(this.loaderLineContainerEl, {
                    opacity: 1,
                    y: 0,
                    scaleY: 1,
                    duration: 0.6,
                    ease: "sine.out"
                }, "-=0.6")
                .to(this.loaderLineFillEl, {
                    width: "100%",
                    duration: this.options.lineLoadDuration / 1000,
                    ease: "none"
                }, "-=0.2");

            this.maxTimeoutId = setTimeout(() => this.hide(true), this.options.timeout);
        }

        _handleWindowLoad() { 
            this.windowLoadFired = true; 
            this._attemptHide(); 
        }
        
        _attemptHide() { 
            if (!this.isVisible || !this.windowLoadFired) return; 
            const elapsed = Date.now() - this.splashShownTimestamp; 
            if(elapsed >= this.options.minDisplayTime) {
                this.hide(false); 
            } else { 
                const remaining = this.options.minDisplayTime - elapsed; 
                clearTimeout(this.minDisplayTimeoutId); 
                this.minDisplayTimeoutId = setTimeout(() => this.hide(false), remaining);
            }
        }
        
        hide(forced = false) {
            if (!this.isVisible) return;
            this._executeCallback('onHideStart', forced);
            this.isVisible = false;
            clearTimeout(this.maxTimeoutId); clearTimeout(this.minDisplayTimeoutId);
            if (this.animationTimeline) this.animationTimeline.kill();

            const onHideCompleteInternal = () => {
                this.splashElement.classList.remove('sugam-splash-visible');
                this.splashElement.classList.add('sugam-splash-hidden');
                this.splashElement.style.animationPlayState = 'paused';
                document.body.style.overflow = '';
                const mainContent = document.querySelector(this.options.mainContentSelector);
                if (mainContent) {
                    mainContent.style.display = 'block';
                    gsap.fromTo(mainContent, {opacity: 0}, {opacity: 1, duration: 0.7, ease: "power2.out"});
                }
                this._executeCallback('onHideComplete', forced);
            };

            if (forced) {
                gsap.to(this.splashElement, { opacity: 0, duration: 0.4, ease: "power2.in", onComplete: onHideCompleteInternal });
            } else {
                const popOutro = gsap.timeline();
                popOutro.to(this.nameCharsEl, {
                    opacity: 0, scale: 0.1, y: -15, filter: 'blur(5px)',
                    rotateZ: (i) => (i % 2 === 0 ? -30 : 30) + (Math.random() * 20 - 10),
                    duration: 0.5, stagger: { amount: 0.4, from: "center", ease: "power1.in" },
                    ease: "power2.in"
                });
                popOutro.to([this.signatureEl.querySelector('.sugam-crafted-by'), this.loaderLineContainerEl], {
                    opacity: 0,
                    scale: 0,
                    filter: 'blur(3px)',
                    duration: 0.4,
                    stagger: 0.08,
                    ease: "back.in(1.2)"
                }, "-=0.25");
                popOutro.to(this.splashElement, {
                    opacity: 0, duration: 0.8, ease: "power2.inOut",
                    onComplete: onHideCompleteInternal
                }, "+=0.05");
            }
        }
    }

    // Initialize splash screen
    const splash = new SugamSplash({
        theme: 'dark',
        minDisplayTime: 5000,
        lineLoadDuration: 3000
    });
    splash.show();
    window.addEventListener('load', () => splash._handleWindowLoad());

    // Constants and variables
    const MAX_IMAGE_DIMENSION = 1024;
    const DEFAULT_OUTPUT_DIMENSION = 512;
    const LITTERBOX_API_URL = 'https://litterbox.catbox.moe/resources/internals/api.php';
    const PLAYER_SIZE = 30;
    const BULLET_SIZE = 8;
    const ENEMY_SIZE = 25;
    const BULLET_COOLDOWN = 10;
    const ENEMY_SPAWN_INTERVAL = 60;
    const PLAYER_EMOJI = '🚀';
    const BULLET_EMOJI = '⭐';
    const ENEMY_EMOJI = '👾';

    let currentMode = 'edit';
    let currentResizedImagePreviewDataUrl = null;
    let uploadedFileUrl = null;
    let cameraStream = null;
    let gameRunning = false;
    let player, bullets, enemies, enemySpawnTimer, currentScore, playerLives;
    let isShooting = false;
    let framesSinceLastShot = BULLET_COOLDOWN;
    let gameOverDisplayed = false;
    let animationFrameId = null;
    let gameCanvas = null;
    let gameCtx = null;

    // DOM elements
    const imageUpload = document.getElementById('imageUpload');
    const takePhotoButton = document.getElementById('takePhotoButton');
    const imagePreview = document.getElementById('imagePreview');
    const previewPlaceholder = document.getElementById('previewPlaceholder');
    const promptInput = document.getElementById('promptInput');
    const transformButton = document.getElementById('transformButton');
    const buttonText = transformButton.querySelector('.button-text');
    const spinner = transformButton.querySelector('.spinner');
    const statusMessage = document.getElementById('statusMessage');
    const resultSection = document.querySelector('.result-section');
    const resultImage = document.getElementById('resultImage');
    const downloadLink = document.getElementById('downloadLink');
    const editGeneratedImageButton = document.getElementById('editGeneratedImageButton');
    const uploadSectionContainer = document.getElementById('uploadSectionContainer');
    const instructionsTitle = document.getElementById('instructionsTitle');
    const qualityStepNumber = document.getElementById('qualityStepNumber');
    const outputWidthInput = document.getElementById('outputWidth');
    const outputHeightInput = document.getElementById('outputHeight');
    const cameraModal = document.getElementById('cameraModal');
    const closeCameraModalButton = document.getElementById('closeCameraModal');
    const cancelCameraButton = document.getElementById('cancelCameraButton');
    const snapPhotoButton = document.getElementById('snapPhotoButton');
    const cameraFeed = document.getElementById('cameraFeed');
    const photoCanvas = document.getElementById('photoCanvas');
    const generationModeRadios = document.querySelectorAll('input[name="generationMode"]');
    const imageQualityRadios = document.querySelectorAll('input[name="imageQuality"]');
    const modeEditRadio = document.getElementById('modeEdit');
    const creativeCornerDiv = document.getElementById('creativeCorner');
    const creativeThoughtP = document.getElementById('creativeThought');
    const miniGameContainer = document.getElementById('miniGameContainer');
    const gameArea = document.getElementById('gameArea');
    const gameScoreDisplay = document.getElementById('gameScore');
    const gameLivesDisplay = document.getElementById('gameLives');

    // Add tab functionality
    const tabButtons = document.querySelectorAll('.tab-button');
    const views = document.querySelectorAll('.view');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetView = button.getAttribute('data-view');
            
            // Remove active class from all tabs and views
            tabButtons.forEach(tab => tab.classList.remove('active'));
            views.forEach(view => view.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding view
            button.classList.add('active');
            document.getElementById(targetView + 'View').classList.add('active');
            
            // Load gallery if gallery tab is clicked
            if (targetView === 'gallery') {
                loadGallery();
            }
        });
    });

    // Event listeners
    imageUpload.addEventListener('change', handleFileSelect);
    takePhotoButton.addEventListener('click', openCamera);
    closeCameraModalButton.addEventListener('click', closeCamera);
    cancelCameraButton.addEventListener('click', closeCamera);
    snapPhotoButton.addEventListener('click', snapPhoto);
    promptInput.addEventListener('input', checkFormValidity);
    transformButton.addEventListener('click', handleTransform);
    editGeneratedImageButton.addEventListener('click', handleEditGeneratedImage);

    generationModeRadios.forEach(radio => radio.addEventListener('change', handleModeChange));
    imageQualityRadios.forEach(radio => radio.addEventListener('change', checkFormValidity));

    updateUIVisibility();
    checkFormValidity();

    // Gallery functionality
    function loadGallery() {
        const galleryGrid = document.getElementById('galleryGrid');
        const galleryEmptyMessage = document.getElementById('galleryEmptyMessage');
        
        try {
            const savedImages = JSON.parse(localStorage.getItem('picvaan_gallery') || '[]');
            
            if (savedImages.length === 0) {
                galleryEmptyMessage.style.display = 'block';
                galleryGrid.innerHTML = '';
                return;
            }
            
            galleryEmptyMessage.style.display = 'none';
            galleryGrid.innerHTML = '';
            
            savedImages.forEach((item, index) => {
                const galleryItem = document.createElement('div');
                galleryItem.className = 'gallery-item';
                galleryItem.innerHTML = `
                    <img src="${item.imageUrl}" alt="Generated image" onclick="viewFullImage('${item.imageUrl}')">
                    <div class="gallery-info">
                        <div class="gallery-prompt">${item.prompt}</div>
                    </div>
                    <div class="gallery-actions">
                        <button class="edit-button" onclick="editFromGallery(${index})">
                            ✏️ Edit
                        </button>
                        <button class="delete-button" onclick="deleteFromGallery(${index})">
                            🗑️ Delete
                        </button>
                    </div>
                `;
                galleryGrid.appendChild(galleryItem);
            });
        } catch (error) {
            console.error('Error loading gallery:', error);
            galleryEmptyMessage.style.display = 'block';
            galleryGrid.innerHTML = '';
        }
    }

    function saveToGallery(imageUrl, prompt) {
        try {
            const savedImages = JSON.parse(localStorage.getItem('picvaan_gallery') || '[]');
            const newItem = {
                imageUrl: imageUrl,
                prompt: prompt,
                timestamp: Date.now()
            };
            savedImages.unshift(newItem);
            
            if (savedImages.length > 50) {
                savedImages.splice(50);
            }
            
            localStorage.setItem('picvaan_gallery', JSON.stringify(savedImages));
        } catch (error) {
            console.error('Error saving to gallery:', error);
        }
    }

    window.viewFullImage = function(imageUrl) {
        window.open(imageUrl, '_blank');
    };

    window.editFromGallery = async function(index) {
        try {
            const savedImages = JSON.parse(localStorage.getItem('picvaan_gallery') || '[]');
            if (savedImages[index]) {
                const item = savedImages[index];
                
                document.querySelector('.tab-button[data-view="main"]').click();
                modeEditRadio.checked = true;
                await handleModeChange({ target: { value: 'edit' } });
                
                await processImageInput(item.imageUrl, "gallery image");
                
                promptInput.value = item.prompt;
                promptInput.focus();
                
                setStatus('🌿 Gallery image loaded! Ready for new transformations! 🌿', false, true);
            }
        } catch (error) {
            console.error('Error editing from gallery:', error);
            setStatus('🚫 Error loading image from gallery.', true);
        }
    };

    window.deleteFromGallery = function(index) {
        if (confirm('🗑️ Are you sure you want to delete this creation from your forest gallery?')) {
            try {
                const savedImages = JSON.parse(localStorage.getItem('picvaan_gallery') || '[]');
                savedImages.splice(index, 1);
                localStorage.setItem('picvaan_gallery', JSON.stringify(savedImages));
                loadGallery();
                setStatus('🌿 Creation removed from gallery.', false, true);
            } catch (error) {
                console.error('Error deleting from gallery:', error);
                setStatus('🚫 Error deleting from gallery.', true);
            }
        }
    };

    function getImageDimensions(dataUrl) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                resolve({ width: img.width, height: img.height });
            };
            img.onerror = (err) => {
                console.error("Error loading image to get dimensions:", err);
                reject(new Error("Could not get image dimensions."));
            };
            img.src = dataUrl;
        });
    }

    async function handleModeChange(event) {
        currentMode = event.target.value;
        await updateUIVisibility();
        if (currentMode === 'create') {
            currentResizedImagePreviewDataUrl = null;
            uploadedFileUrl = null;
            imagePreview.src = '#';
            imagePreview.style.display = 'none';
            previewPlaceholder.textContent = '🌿 Your image will bloom here 🌿';
            previewPlaceholder.style.display = 'block';
            imageUpload.value = '';
            outputWidthInput.value = DEFAULT_OUTPUT_DIMENSION;
            outputHeightInput.value = DEFAULT_OUTPUT_DIMENSION;
        } else {
            if (currentResizedImagePreviewDataUrl) {
                try {
                    const dims = await getImageDimensions(currentResizedImagePreviewDataUrl);
                    outputWidthInput.value = dims.width;
                    outputHeightInput.value = dims.height;
                } catch (e) {
                    console.warn("Could not set dimensions from existing preview on mode change:", e);
                    outputWidthInput.value = DEFAULT_OUTPUT_DIMENSION;
                    outputHeightInput.value = DEFAULT_OUTPUT_DIMENSION;
                }
            } else {
                outputWidthInput.value = DEFAULT_OUTPUT_DIMENSION;
                outputHeightInput.value = DEFAULT_OUTPUT_DIMENSION;
            }
        }
        checkFormValidity();
    }

    async function updateUIVisibility() {
        if (currentMode === 'edit') {
            uploadSectionContainer.style.display = 'block';
            instructionsTitle.textContent = '🌟 2. Describe Your Vision';
            qualityStepNumber.textContent = '🎯 3';
            promptInput.placeholder = "e.g., 'transform into a mystical forest painting', 'add magical fireflies dancing'";
            if (currentResizedImagePreviewDataUrl) {
                try {
                    const dims = await getImageDimensions(currentResizedImagePreviewDataUrl);
                    outputWidthInput.value = dims.width;
                    outputHeightInput.value = dims.height;
                } catch (e) {
                    outputWidthInput.value = DEFAULT_OUTPUT_DIMENSION;
                    outputHeightInput.value = DEFAULT_OUTPUT_DIMENSION;
                }
            } else {
                outputWidthInput.value = DEFAULT_OUTPUT_DIMENSION;
                outputHeightInput.value = DEFAULT_OUTPUT_DIMENSION;
            }
        } else {
            uploadSectionContainer.style.display = 'none';
            instructionsTitle.textContent = '🌟 1. Describe Your Vision';
            qualityStepNumber.textContent = '🎯 2';
            promptInput.placeholder = "e.g., 'a majestic forest with ancient trees', 'magical woodland creatures in moonlight'";
            outputWidthInput.value = DEFAULT_OUTPUT_DIMENSION;
            outputHeightInput.value = DEFAULT_OUTPUT_DIMENSION;
        }
        if (miniGameContainer.style.display !== 'none' && gameRunning) {
            endMiniGame();
        }
    }

    function checkFormValidity() {
        const promptFilled = promptInput.value.trim() !== '';
        if (currentMode === 'edit') {
            transformButton.disabled = !(uploadedFileUrl && promptFilled);
        } else {
            transformButton.disabled = !promptFilled;
        }
        
        if (buttonText) {
            buttonText.textContent = currentMode === 'edit' ? '🌟 Transform Your Vision! 🌟' : '🌟 Grow Your Vision! 🌟';
        }
    }

    function dataURLtoFile(dataurl, filename) {
        let arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
            bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
        while(n--){
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new File([u8arr], filename, {type:mime});
    }

    async function uploadToTmpFiles(fileObject) {
        setStatus('🌱 Planting your image in the cloud...', false);
        const formData = new FormData();
        formData.append('reqtype', 'fileupload');
        formData.append('time', '1h');
        formData.append('fileToUpload', fileObject);

        try {
            const response = await fetch(LITTERBOX_API_URL, {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                const directDownloadUrl = await response.text();
                
                if (directDownloadUrl && directDownloadUrl.startsWith('https://')) {
                    setStatus('🌿 Image ready for transformation!', false, true);
                    return directDownloadUrl.trim();
                } else {
                    throw new Error(`Litterbox API error: Invalid response - ${directDownloadUrl}`);
                }
            } else {
                const errorMessage = `Litterbox API error: ${response.status} ${response.statusText}`;
                throw new Error(errorMessage);
            }
        } catch (error) {
            console.error('Error uploading to litterbox.catbox.moe:', error);
            throw error;
        }
    }

    async function processImageInput(imageDataUrl, sourceDescription = "image") {
        currentResizedImagePreviewDataUrl = null;
        uploadedFileUrl = null;
        checkFormValidity(); 

        setStatus(`🌱 Processing ${sourceDescription}...`, false);
        imagePreview.style.display = 'none';
        previewPlaceholder.style.display = 'block';
        previewPlaceholder.textContent = `🌿 Growing ${sourceDescription}...`;
        resultSection.style.display = 'none'; 

        try {
            const resizedDataUrl = await new Promise((resolve, reject) => {
                resizeImage(imageDataUrl, MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION, resolve, reject);
            });

            currentResizedImagePreviewDataUrl = resizedDataUrl;
            imagePreview.src = currentResizedImagePreviewDataUrl;
            imagePreview.style.display = 'block';
            previewPlaceholder.style.display = 'none';
            
            try {
                const dims = await getImageDimensions(currentResizedImagePreviewDataUrl);
                outputWidthInput.value = dims.width;
                outputHeightInput.value = dims.height;
            } catch (dimError) {
                console.warn("Could not auto-set dimensions from new preview:", dimError);
                outputWidthInput.value = DEFAULT_OUTPUT_DIMENSION; 
                outputHeightInput.value = DEFAULT_OUTPUT_DIMENSION;
            }

            const imageFile = dataURLtoFile(resizedDataUrl, `picvaan_upload_${Date.now()}.jpg`);
            uploadedFileUrl = await uploadToTmpFiles(imageFile);
            checkFormValidity();

        } catch (error) {
            setStatus(`🚫 Error preparing ${sourceDescription}: ${error.message}`, true);
            currentResizedImagePreviewDataUrl = null;
            uploadedFileUrl = null;
            imagePreview.style.display = 'none';
            previewPlaceholder.textContent = '🌿 Your image will bloom here 🌿';
            previewPlaceholder.style.display = 'block';
            checkFormValidity();
        }
    }

    function handleFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                setStatus('🚫 Please upload a valid image file.', true);
                return;
            }
            const reader = new FileReader();
            reader.onload = (e) => {
                processImageInput(e.target.result, "chosen image");
            };
            reader.onerror = () => {
                 setStatus('🚫 Error reading file.', true);
            };
            reader.readAsDataURL(file);
        }
    }

    function resizeImage(dataUrl, maxWidth, maxHeight, callback, errorCallback) {
        const img = new Image();
        img.onload = () => {
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width = Math.round((width * maxHeight) / height);
                    height = maxHeight;
                }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            let outputFormat = 'image/jpeg'; 
            callback(canvas.toDataURL(outputFormat, 0.9)); 
        };
        img.onerror = () => {
            console.error('Error loading image for resizing.');
            if (errorCallback) errorCallback(new Error('Error loading image for resizing.'));
            else setStatus('🚫 Error loading image for resizing.', true);
        };
        img.src = dataUrl;
    }

    async function openCamera() {
        if (currentMode !== 'edit') {
            setStatus('📸 Camera can only be used in "Edit Existing Image" mode.', true);
            return;
        }
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
        }
        cameraModal.style.display = 'flex';
        try {
            cameraStream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    facingMode: "environment",
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                } 
            });
            cameraFeed.srcObject = cameraStream;
            cameraFeed.onloadedmetadata = () => {
                 cameraFeed.play();
            };
            setStatus('📸 Camera active. Point and capture your moment!', false);
        } catch (err) {
            console.error("Error accessing camera:", err);
            setStatus(`🚫 Camera error: ${err.message}. Ensure permission is granted.`, true);
            cameraModal.style.display = 'none';
        }
    }

    function closeCamera() {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            cameraStream = null;
        }
        cameraFeed.srcObject = null;
        cameraModal.style.display = 'none';
        setStatus('');
    }

    function snapPhoto() {
        if (!cameraStream || !cameraFeed.videoWidth) {
             setStatus('📸 Camera not ready or photo already snapped.', true);
             return;
        }
        const context = photoCanvas.getContext('2d');
        photoCanvas.width = cameraFeed.videoWidth;
        photoCanvas.height = cameraFeed.videoHeight;
        context.drawImage(cameraFeed, 0, 0, photoCanvas.width, photoCanvas.height);
        
        const capturedDataUrl = photoCanvas.toDataURL('image/jpeg', 0.9);
        closeCamera();
        processImageInput(capturedDataUrl, "captured photo");
    }

    async function blobUrlToDataUrl(blobUrl) {
        try {
            const response = await fetch(blobUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch blob: ${response.status} ${response.statusText}`);
            }
            const blob = await response.blob();
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = (error) => reject(new Error(`FileReader error: ${error.message}`));
                reader.readAsDataURL(blob);
            });
        } catch (error) {
            console.error("Error converting blob URL to Data URL:", error);
            throw error;
        }
    }

    async function handleEditGeneratedImage() {
        if (!resultImage.src || resultImage.src === '#' || resultImage.src.startsWith('http://localhost')) {
            setStatus('🚫 No generated image to edit.', true);
            return;
        }

        setStatus('🌱 Preparing your creation for further cultivation...', false);
        editGeneratedImageButton.disabled = true;

        try {
            if (currentMode !== 'edit') {
                currentMode = 'edit';
                modeEditRadio.checked = true;
                await updateUIVisibility(); 
            }

            const imageDataUrl = await blobUrlToDataUrl(resultImage.src);
            await processImageInput(imageDataUrl, "your previous creation"); 
            
            resultSection.style.display = 'none';
            downloadLink.style.display = 'none';
            editGeneratedImageButton.style.display = 'none';
            
            promptInput.value = ''; 
            promptInput.focus();
            setStatus('🌿 Image ready for new transformation. Describe your next vision!', false, true);
            window.scrollTo({ top: 0, behavior: 'smooth' });

        } catch (error) {
            setStatus(`🚫 Error preparing image for editing: ${error.message}`, true);
            console.error("Error in handleEditGeneratedImage:", error);
        } finally {
            editGeneratedImageButton.disabled = false;
        }
    }

    // Space Shooter Game Logic
    function initGameSpecifics() {
        player = {
            x: gameCanvas.width / 2 - PLAYER_SIZE / 2,
            y: gameCanvas.height - PLAYER_SIZE - 10,
            width: PLAYER_SIZE,
            height: PLAYER_SIZE,
            speed: 8 
        };
        bullets = [];
        enemies = [];
        enemySpawnTimer = 0;
        currentScore = 0; 
        gameScoreDisplay.textContent = currentScore;
        playerLives = 3; 
        gameLivesDisplay.textContent = playerLives; 
        isShooting = false;
        framesSinceLastShot = BULLET_COOLDOWN; 
        gameOverDisplayed = false;
        
        const existingGameOverMsg = gameArea.querySelector('.game-over-text');
        if (existingGameOverMsg) {
            existingGameOverMsg.remove();
        }
    }

    function handlePlayerMove(event) {
        if (!gameRunning || !gameCanvas) return;
        const rect = gameCanvas.getBoundingClientRect();
        const newX = event.clientX - rect.left - player.width / 2;
        player.x = Math.max(0, Math.min(gameCanvas.width - player.width, newX));
    }

    function handlePlayerTouchMove(event) {
        if (!gameRunning || !gameCanvas || event.touches.length === 0) return;
        event.preventDefault(); 
        const rect = gameCanvas.getBoundingClientRect();
        const touch = event.touches[0];
        const newX = touch.clientX - rect.left - player.width / 2;
        player.x = Math.max(0, Math.min(gameCanvas.width - player.width, newX));
    }
    
    function handleShootStart(event) { 
        if (!gameRunning) return;
        event.preventDefault(); 
        isShooting = true;
        if (framesSinceLastShot >= BULLET_COOLDOWN) {
            shootBullet();
            framesSinceLastShot = 0;
        }
    }

    function handleShootEnd() { 
        isShooting = false;
    }

    function shootBullet() {
        bullets.push({
            x: player.x + player.width / 2 - BULLET_SIZE / 2, 
            y: player.y,
            width: BULLET_SIZE,
            height: BULLET_SIZE * 1.5, 
            speed: 7
        });
    }

    function updatePlayer() {
        if (isShooting && framesSinceLastShot >= BULLET_COOLDOWN) {
            shootBullet();
            framesSinceLastShot = 0;
        }
        framesSinceLastShot++;
    }

    function drawPlayer() {
        if (!gameCtx) return;
        gameCtx.font = `${PLAYER_SIZE}px Arial`;
        gameCtx.textAlign = "center";
        gameCtx.textBaseline = "middle";
        gameCtx.fillText(PLAYER_EMOJI, player.x + player.width / 2, player.y + player.height / 2);
    }

    function updateBullets() {
        for (let i = bullets.length - 1; i >= 0; i--) {
            bullets[i].y -= bullets[i].speed;
            if (bullets[i].y + bullets[i].height < 0) {
                bullets.splice(i, 1);
            }
        }
    }

    function drawBullets() {
        if (!gameCtx) return;
        gameCtx.font = `${BULLET_SIZE}px Arial`;
        gameCtx.textAlign = "center";
        gameCtx.textBaseline = "middle";
        bullets.forEach(bullet => {
            gameCtx.fillText(BULLET_EMOJI, bullet.x + bullet.width/2, bullet.y + bullet.height/2);
        });
    }

    function spawnEnemy() {
        enemySpawnTimer++;
        if (enemySpawnTimer >= ENEMY_SPAWN_INTERVAL) {
            enemySpawnTimer = 0;
            const x = Math.random() * (gameCanvas.width - ENEMY_SIZE);
            enemies.push({
                x: x,
                y: 0 - ENEMY_SIZE, 
                width: ENEMY_SIZE,
                height: ENEMY_SIZE,
                speed: 1 + Math.random() * 2 
            });
        }
    }

    function updateEnemies() {
        for (let i = enemies.length - 1; i >= 0; i--) {
            enemies[i].y += enemies[i].speed;
            if (enemies[i].y > gameCanvas.height) { 
                enemies.splice(i, 1);
                playerLives--;
                updateLivesDisplay();
                if (playerLives <= 0 && gameRunning) {
                    gameOver(); 
                }
            }
        }
    }

    function drawEnemies() {
        if (!gameCtx) return;
        gameCtx.font = `${ENEMY_SIZE}px Arial`;
        gameCtx.textAlign = "center";
        gameCtx.textBaseline = "middle";
        enemies.forEach(enemy => {
           gameCtx.fillText(ENEMY_EMOJI, enemy.x + enemy.width/2, enemy.y + enemy.height/2);
        });
    }

    function checkCollisions() {
        if (!gameRunning) return; 

        for (let i = bullets.length - 1; i >= 0; i--) {
            for (let j = enemies.length - 1; j >= 0; j--) {
                if (bullets[i] && enemies[j] &&
                    bullets[i].x < enemies[j].x + enemies[j].width &&
                    bullets[i].x + bullets[i].width > enemies[j].x &&
                    bullets[i].y < enemies[j].y + enemies[j].height &&
                    bullets[i].y + bullets[i].height > enemies[j].y) {
                    
                    bullets.splice(i, 1);
                    enemies.splice(j, 1);
                    currentScore += 10;
                    gameScoreDisplay.textContent = currentScore;
                    break; 
                }
            }
        }

        for (let i = enemies.length - 1; i >= 0; i--) {
            if (player.x < enemies[i].x + enemies[i].width &&
                player.x + player.width > enemies[i].x &&
                player.y < enemies[i].y + enemies[i].height &&
                player.y + player.height > enemies[i].y) {
                
                enemies.splice(i, 1); 
                playerLives--;
                updateLivesDisplay();

                if (playerLives <= 0 && gameRunning) {
                    gameOver();
                }
                return; 
            }
        }
    }
    
    function updateLivesDisplay() {
        gameLivesDisplay.textContent = playerLives;
    }
    
    function gameOver() {
        if (!gameRunning) return; 
        gameRunning = false; 
        isShooting = false; 

        if (animationFrameId) cancelAnimationFrame(animationFrameId); 
        gameLoop();
    }

    function gameLoop() {
        if (!gameCtx || !gameCanvas) return; 

        if (!gameRunning) {
            if (gameOverDisplayed) { 
                gameCtx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);
                drawPlayer(); 
                drawBullets(); 
                drawEnemies(); 

                gameCtx.fillStyle = "rgba(0, 0, 0, 0.7)";
                gameCtx.fillRect(0, gameCanvas.height / 2 - 40, gameCanvas.width, 80);
                
                gameCtx.font = "bold 24px Arial";
                gameCtx.fillStyle = "white";
                gameCtx.textAlign = "center";
                gameCtx.fillText("GAME OVER!", gameCanvas.width / 2, gameCanvas.height / 2 - 10);
                gameCtx.font = "18px Arial";
                gameCtx.fillText("Final Score: " + currentScore, gameCanvas.width / 2, gameCanvas.height / 2 + 20);
            }
            return; 
        }
        
        gameCtx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);

        updatePlayer();
        updateBullets();
        spawnEnemy();
        updateEnemies();
        
        drawPlayer();
        drawBullets();
        drawEnemies();
        
        checkCollisions(); 

        if (gameRunning) { 
            animationFrameId = requestAnimationFrame(gameLoop);
        } else if (gameOverDisplayed) {
            requestAnimationFrame(gameLoop); 
        }
    }

    function startMiniGame() {
        if (gameRunning && !gameOverDisplayed) endMiniGame(); 

        gameRunning = true;
        gameOverDisplayed = false; 
        miniGameContainer.style.display = 'block';
        creativeCornerDiv.style.display = 'none'; 
        
        if (!gameCanvas) { 
            gameArea.innerHTML = ''; 
            gameCanvas = document.createElement('canvas');
            gameCanvas.id = 'gameCanvas'; 
            gameArea.appendChild(gameCanvas);

            try {
                gameCanvas.width = gameArea.clientWidth;
                gameCanvas.height = gameArea.clientHeight;
                gameCtx = gameCanvas.getContext('2d');
            } catch (e) {
                console.error("Error setting up game canvas:", e);
                setStatus("🚫 Could not start mini-game.", true);
                gameRunning = false;
                miniGameContainer.style.display = 'none';
                return;
            }
            gameCanvas.addEventListener('mousemove', handlePlayerMove);
            gameCanvas.addEventListener('mousedown', handleShootStart);
            gameCanvas.addEventListener('touchmove', handlePlayerTouchMove, { passive: false }); 
            gameCanvas.addEventListener('touchstart', handleShootStart, { passive: false });
            
            window.addEventListener('mouseup', handleShootEnd);
            window.addEventListener('touchend', handleShootEnd);

        } else {
            gameCtx.clearRect(0,0, gameCanvas.width, gameCanvas.height);
        }

        initGameSpecifics(); 

        if (animationFrameId) cancelAnimationFrame(animationFrameId); 
        gameLoop();
    }

    function endMiniGame() {
        gameRunning = false;
        isShooting = false; 

        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }

        miniGameContainer.style.display = 'none';
        if (gameArea && gameCanvas) { 
             gameCtx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);
        }
    }

    async function showCreativeThought() {
        if (gameRunning) { 
            creativeCornerDiv.style.display = 'none';
            return;
        }
        creativeCornerDiv.style.display = 'block';
        creativeThoughtP.textContent = '🌱 Seeds of inspiration are sprouting... ';
        try {
            const completion = await websim.chat.completions.create({
                messages: [
                    { role: "system", content: "You are a nature-loving AI assistant. Briefly offer a single, inspiring thought about art, creativity, nature, or digital transformation while the user waits for an image to generate. Keep it under 25 words. Use forest/nature metaphors when possible. Be encouraging and mystical!" },
                    { role: "user", content: "Give me a nature-inspired waiting message for image generation." }
                ]
            });
            creativeThoughtP.textContent = completion.content || "🌿 In the digital forest, every pixel grows into something magical!";
        } catch (error) {
            console.error("Error fetching creative thought:", error);
            creativeThoughtP.textContent = "🌸 Your imagination is blooming... watch as magic takes root!";
        }
    }

    async function handleTransform() {
        const promptValue = promptInput.value.trim();
        if (currentMode === 'edit' && !uploadedFileUrl) {
            setStatus('🚫 Please upload an image for editing mode.', true);
            return;
        }
        if (!promptValue) {
            setStatus('🚫 Please provide instructions or a description.', true);
            return;
        }

        setLoadingState(true);
        setStatus('🌟 Summoning AI forest magic... this may take a moment.', false);
        resultSection.style.display = 'none';
        resultImage.src = '#'; 
        downloadLink.style.display = 'none';
        editGeneratedImageButton.style.display = 'none';
        
        startMiniGame(); 
        const selectedQuality = document.querySelector('input[name="imageQuality"]:checked').value;
        
        let outputWidth = parseInt(outputWidthInput.value, 10) || DEFAULT_OUTPUT_DIMENSION;
        let outputHeight = parseInt(outputHeightInput.value, 10) || DEFAULT_OUTPUT_DIMENSION;

        outputWidth = Math.max(64, Math.min(2048, outputWidth));
        outputHeight = Math.max(64, Math.min(2048, outputHeight));
        
        const instructions = promptInput.value.trim();
        const seed = Math.floor(Math.random() * 10000000);
        const POLLINATIONS_TOKEN = 'sugamdeol';

        let apiUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(instructions)}` +
                       `?model=gptimage` + 
                       `&token=${POLLINATIONS_TOKEN}` +
                       `&seed=${seed}` +
                       `&width=${outputWidth}` +
                       `&height=${outputHeight}` +
                       `&quality=${selectedQuality}` + 
                       `&nologo=true`;

        if (currentMode === 'edit' && uploadedFileUrl) {
            apiUrl += `&image=${encodeURIComponent(uploadedFileUrl)}`;
        }
        
        try {
            const response = await fetch(apiUrl);

            if (!response.ok) {
                let errorDetail = `API returned status ${response.status}.`;
                try {
                    const errorText = await response.text();
                    if(errorText.length < 200 && errorText.length > 0) { 
                         errorDetail += ` Details: ${errorText}`;
                    } else if (errorText.length === 0) {
                        errorDetail += ` No additional details from API.`;
                    }
                } catch (e) { /* ignore */ }
                throw new Error(errorDetail);
            }

            const imageBlob = await response.blob();
            if (!imageBlob.type.startsWith('image/')) {
                throw new Error('API did not return a valid image. Please try different instructions, image, or quality setting.');
            }

            const generatedImageDataUrl = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.readAsDataURL(imageBlob);
            });

            const generatedImageUrl = URL.createObjectURL(imageBlob);
            resultImage.src = generatedImageUrl;
            downloadLink.href = generatedImageUrl;
            downloadLink.download = `picvaan_creation_${Date.now()}.${imageBlob.type.split('/')[1] || 'png'}`;
            
            saveToGallery(generatedImageDataUrl, instructions);
            
            resultSection.style.display = 'block';
            downloadLink.style.display = 'inline-block';
            editGeneratedImageButton.style.display = 'inline-block';
            setStatus('🌺 Transformation complete! Your digital masterpiece has bloomed! 🌺', false, true);

        } catch (error) {
            console.error('Error transforming image:', error);
            setStatus(`🚫 Error: ${error.message}. Please try again or adjust your prompt/image/quality.`, true);
            resultSection.style.display = 'none';
        } finally {
            setLoadingState(false);
            endMiniGame(); 
            creativeCornerDiv.style.display = 'none'; 
        }
    }

    function setLoadingState(isLoading) {
        transformButton.disabled = isLoading;
        if (isLoading) {
            spinner.style.display = 'block';
            buttonText.textContent = '🌱 Growing Magic...';
            showCreativeThought();
        } else {
            spinner.style.display = 'none';
            buttonText.textContent = currentMode === 'edit' ? '🌟 Transform Your Vision! 🌟' : '🌟 Grow Your Vision! 🌟';
            checkFormValidity();
        }
    }

    function setStatus(message, isError = false, isSuccess = false) {
        statusMessage.textContent = message;
        statusMessage.classList.remove('error', 'success');
        if (isError) {
            statusMessage.classList.add('error');
        } else if (isSuccess) {
            statusMessage.classList.add('success');
        }
    }

    handleModeChange({ target: { value: document.querySelector('input[name="generationMode"]:checked').value } });
});